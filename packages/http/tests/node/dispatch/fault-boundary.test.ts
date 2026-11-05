import { DiscordAPIError } from '@discordjs/rest';
import { InteractionKind, Silence } from '@seedcord/core';
import { MessageFlags } from 'discord-api-types/v10';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { restClients } from '#tests/helpers/restClients';

import { capturingCtx, readyEngine, routedHandler, signedRequest, slashPayload, type BotClasses } from './harness';

import type { HandlerConstructor } from '#handlers/constructors';

function apiError(code: number): DiscordAPIError {
    return new DiscordAPIError({ code, message: 'boom' }, code, 404, 'POST', 'url', {});
}

function slashRoute(name: string, handler: HandlerConstructor): BotClasses {
    return routedHandler(InteractionKind.Slash, name, handler);
}

interface SentBody {
    type?: number;
    data?: { flags?: number; components?: unknown[]; choices?: unknown[] };
    components?: unknown[];
}

function postedBodies(): { route: string; body: SentBody }[] {
    const calls = (restClients()[0]?.post.mock.calls ?? []) as [string, { body: SentBody }][];
    return calls.map(([route, options]) => ({ route, body: options.body }));
}

beforeEach(() => {
    restClients().length = 0;
});

describe('fault boundary', () => {
    it('logs a raw execute fault and sends the generic Fault card through the sender', async () => {
        class Broken extends SlashHandler<never> {
            async execute(): Promise<void> {
                await Promise.resolve();
                throw new Error('db exploded');
            }
        }
        using engine = await readyEngine(slashRoute('broken', Broken));
        const { signer, handle } = engine;
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

    it('sends the fault card as a follow-up when the handler already replied', async () => {
        class RepliedThenBroke extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('halfway');
                throw new Error('late failure');
            }
        }
        using engine = await readyEngine(slashRoute('late', RepliedThenBroke));
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('late')), ctx);
        await ctx.settled();

        const posts = postedBodies();
        expect(posts).toHaveLength(2);
        expect(posts[0]?.route).toBe('/interactions/int-1/tok/callback');
        expect(posts[1]?.route).toBe('/webhooks/app-1/tok');
    });

    it('swallows an api code listed in ignoreApiCodes without a card', async () => {
        const settings = { errors: { ignoreApiCodes: [10_008] } };
        class DeadEnd extends SlashHandler<never> {
            async execute(): Promise<void> {
                await Promise.resolve();
                throw apiError(10_008);
            }
        }
        using engine = await readyEngine(slashRoute('dead', DeadEnd), { settings });
        const { signer, handle } = engine;
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
        using engine = await readyEngine(slashRoute('broken', Broken));
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('broken')), ctx);
        // the card send fails on a dead interaction token
        restClients()[0]?.post.mockRejectedValueOnce(apiError(10_062));
        releaseExecute(null);

        await expect(ctx.settled()).resolves.toBeUndefined();
        expect(postedBodies()).toHaveLength(1);
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
        using engine = await readyEngine(slashRoute('unstable', ExplodesOnBuild));
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('unstable')), ctx);

        expect(response.status).toBe(202);
        expect(ctx.waitUntil).not.toHaveBeenCalled();
        const posts = postedBodies();
        expect(posts).toHaveLength(1);
        expect(posts[0]?.body.type).toBe(4);
    });

    describe('autocomplete', () => {
        const payload = {
            type: 4,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            user: { id: 'u1', username: 'tester' },
            data: { type: 1, name: 'search', options: [{ type: 3, name: 'q', value: 'x', focused: true }] }
        };

        it('answers an execute fault with an empty type 8', async () => {
            class Search extends AutocompleteHandler<never> {
                async execute(): Promise<void> {
                    await Promise.resolve();
                    throw new Error('lookup failed');
                }
            }
            using engine = await readyEngine(routedHandler(InteractionKind.Autocomplete, 'search', Search));
            const { signer, handle } = engine;
            const ctx = capturingCtx();

            await handle(await signedRequest(signer, payload), ctx);
            await ctx.settled();

            const posts = postedBodies();
            expect(posts).toHaveLength(1);
            expect(posts[0]?.body.type).toBe(8);
            expect(posts[0]?.body.data?.choices).toEqual([]);
        });

        it('does not send empty choices after the handler already responded', async () => {
            class Search extends AutocompleteHandler<never> {
                async execute(): Promise<void> {
                    await this.respond([{ name: 'a', value: 'a' }]);
                    throw new Silence('done');
                }
            }
            using engine = await readyEngine(routedHandler(InteractionKind.Autocomplete, 'search', Search));
            const { signer, handle } = engine;
            const ctx = capturingCtx();

            await handle(await signedRequest(signer, payload), ctx);
            await ctx.settled();

            expect(postedBodies()).toHaveLength(1);
        });
    });
});
