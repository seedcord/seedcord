import { DiscordAPIError } from '@discordjs/rest';
import { Fault, Notice, Silence } from '@seedcord/core';
import { MessageFlags } from 'discord-api-types/v10';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import { FROM, capturingCtx, emptyManifest, readyEngine, signedRequest, slashPayload } from './harness';

import type { Config, RenderContext, ReplyResponse } from '@seedcord/types';
import type { RouteManifest } from '@src/manifest/RouteManifest';
import type { UUID } from 'node:crypto';

const rest = vi.hoisted(() => {
    interface FakeRestInstance {
        post: ReturnType<typeof vi.fn>;
        patch: ReturnType<typeof vi.fn>;
    }
    const instances: FakeRestInstance[] = [];
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public constructor() {
            instances.push(this);
        }

        public setToken(): this {
            return this;
        }
    }
    return { instances, FakeRest };
});

// the factory must not import project modules, vitest loads factory imports in a mock-bypass
// context that would cache the engine graph unmocked
vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    REST: rest.FakeRest
}));

function apiError(code: number): DiscordAPIError {
    return new DiscordAPIError({ code, message: 'boom' }, code, 404, 'POST', 'url', {});
}

function manifestOf(name: string, handler: unknown): RouteManifest {
    return {
        ...emptyManifest(),
        commandRoutes: [{ name, type: 1, exportName: 'handler', from: FROM, load: () => Promise.resolve({ handler }) }]
    };
}

interface SentBody {
    type?: number;
    data?: { flags?: number; components?: unknown[]; choices?: unknown[] };
    components?: unknown[];
}

function postedBodies(): { route: string; body: SentBody }[] {
    const calls = (rest.instances[0]?.post.mock.calls ?? []) as [string, { body: SentBody }][];
    return calls.map(([route, options]) => ({ route, body: options.body }));
}

beforeEach(() => {
    rest.instances.length = 0;
});

describe('fault boundary', () => {
    it('logs a raw execute fault and sends the generic Fault card through the sender', async () => {
        class Broken extends SlashHandler<never> {
            async execute(): Promise<void> {
                await Promise.resolve();
                throw new Error('db exploded');
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('broken', Broken));
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('broken')), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        const posts = postedBodies();
        expect(posts).toHaveLength(1);
        expect(posts[0]?.body.type).toBe(4);
        expect(posts[0]?.body.data?.components).toBeDefined();
        const flags = posts[0]?.body.data?.flags ?? 0;
        expect(flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
    });

    it('drops a post-ack Silence with no card', async () => {
        class Quiet extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('done');
                throw new Silence('user dismissed');
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('quiet', Quiet));
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('quiet')), ctx);
        await ctx.settled();

        expect(postedBodies()).toHaveLength(1);
    });

    it('sends a post-ack Notice card as a follow-up when already replied', async () => {
        class Denied extends Notice {
            public constructor() {
                super('denied late');
            }

            public render(): ReplyResponse {
                return { components: [{ toJSON: () => ({ type: 10, content: 'no access' }) }] };
            }
        }
        class LateDenied extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('working');
                throw new Denied();
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('latedeny', LateDenied));
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('latedeny')), ctx);
        await ctx.settled();

        const posts = postedBodies();
        expect(posts).toHaveLength(2);
        expect(posts[1]?.route).toBe('/webhooks/app-1/tok');
    });

    it('sends the fault card as a follow-up when the handler already replied', async () => {
        class RepliedThenBroke extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('halfway');
                throw new Error('late failure');
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('late', RepliedThenBroke));
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('late')), ctx);
        await ctx.settled();

        const posts = postedBodies();
        expect(posts).toHaveLength(2);
        expect(posts[0]?.route).toBe('/interactions/int-1/tok/callback');
        expect(posts[1]?.route).toBe('/webhooks/app-1/tok');
    });

    it('renders the configured defaultError override instead of the generic Fault', async () => {
        class CustomCard extends Fault {
            public constructor(_uuid: UUID) {
                super();
            }

            public override render(_ctx: RenderContext): ReplyResponse {
                return { components: [{ toJSON: () => ({ type: 10, content: 'custom fault' }) }] };
            }
        }
        const config: Config = {
            bot: { interactions: { path: null }, commands: { path: null } },
            subscribers: { path: null },
            errors: { defaultError: CustomCard }
        };
        class Broken extends SlashHandler<never> {
            async execute(): Promise<void> {
                await Promise.resolve();
                throw new Error('boom');
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('broken', Broken), config);
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('broken')), ctx);
        await ctx.settled();

        expect(postedBodies()[0]?.body.data?.components).toEqual([{ type: 10, content: 'custom fault' }]);
    });

    it('swallows an api code listed in ignoreApiCodes without a card', async () => {
        const config: Config = {
            bot: { interactions: { path: null }, commands: { path: null } },
            subscribers: { path: null },
            errors: { ignoreApiCodes: [10_008] }
        };
        class DeadEnd extends SlashHandler<never> {
            async execute(): Promise<void> {
                await Promise.resolve();
                throw apiError(10_008);
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('dead', DeadEnd), config);
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('dead')), ctx);
        await ctx.settled();

        expect(postedBodies()).toHaveLength(0);
    });

    it('swallows a harmless api code from the card send itself, resolving the tracked work', async () => {
        const { promise: gate, resolve: releaseExecute } = Promise.withResolvers<null>();
        class Broken extends SlashHandler<never> {
            async execute(): Promise<void> {
                await gate;
                throw new Error('boom');
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('broken', Broken));
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('broken')), ctx);
        // the card send dies on a dead interaction token
        rest.instances[0]?.post.mockRejectedValueOnce(apiError(10_062));
        releaseExecute(null);

        await expect(ctx.settled()).resolves.toBeUndefined();
        expect(postedBodies()).toHaveLength(1);
    });

    it('still acks 202 when a manifest row load rejects', async () => {
        const manifest: RouteManifest = {
            ...emptyManifest(),
            commandRoutes: [
                {
                    name: 'ghost',
                    type: 1,
                    exportName: 'Ghost',
                    from: FROM,
                    load: () => Promise.reject(new Error('chunk missing'))
                }
            ]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('ghost')), ctx);

        expect(response.status).toBe(202);
        expect(ctx.waitUntil).not.toHaveBeenCalled();
        const posts = postedBodies();
        expect(posts).toHaveLength(1);
        expect(posts[0]?.body.type).toBe(4);
    });

    it('normalizes a non-Error throw into the generic fault card', async () => {
        class Throws extends SlashHandler<never> {
            async execute(): Promise<void> {
                await Promise.resolve();
                // eslint-disable-next-line no-throw-literal, @typescript-eslint/only-throw-error -- the boundary must survive user code throwing a bare value
                throw 'a bare string';
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('bare', Throws));
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('bare')), ctx);
        await ctx.settled();

        expect(postedBodies()[0]?.body.type).toBe(4);
    });

    it('catches a throwing handler constructor, still acks 202 and sends the fault card', async () => {
        class ExplodesOnBuild extends SlashHandler<never> {
            public constructor(...args: ConstructorParameters<typeof SlashHandler<never>>) {
                super(...args);
                throw new Error('ctor exploded');
            }

            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }
        const { signer, handle } = await readyEngine(manifestOf('unstable', ExplodesOnBuild));
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('unstable')), ctx);

        expect(response.status).toBe(202);
        expect(ctx.waitUntil).not.toHaveBeenCalled();
        const posts = postedBodies();
        expect(posts).toHaveLength(1);
        expect(posts[0]?.body.type).toBe(4);
    });

    it('answers an autocomplete execute fault with an empty type 8', async () => {
        class Search extends AutocompleteHandler<never> {
            async execute(): Promise<void> {
                await Promise.resolve();
                throw new Error('lookup failed');
            }
        }
        const manifest: RouteManifest = {
            ...emptyManifest(),
            autocompleteRoutes: [
                { name: 'search', exportName: 'Search', from: FROM, load: () => Promise.resolve({ Search }) }
            ]
        };
        const { signer, handle } = await readyEngine(manifest);
        const payload = {
            type: 4,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            data: { type: 1, name: 'search', options: [{ type: 3, name: 'q', value: 'x', focused: true }] }
        };
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        const posts = postedBodies();
        expect(posts).toHaveLength(1);
        expect(posts[0]?.body.type).toBe(8);
        expect(posts[0]?.body.data?.choices).toEqual([]);
    });
});
