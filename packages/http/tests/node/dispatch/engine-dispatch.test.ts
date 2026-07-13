import { CustomId } from '@seedcord/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import { capturingCtx, emptyManifest, readyEngine, signedRequest, slashPayload } from './harness';

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

beforeEach(() => {
    rest.instances.length = 0;
});

describe('createSeedcord dispatch', () => {
    it('routes a signed slash request to its handler, whose reply hits the interaction callback', async () => {
        class Ban extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('done');
            }
        }
        const manifest = {
            ...emptyManifest(),
            commands: [{ name: 'ban', type: 1, load: () => Promise.resolve({ Ban }) }]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('ban')), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        await expect(response.text()).resolves.toBe('');
        const first = rest.instances[0];
        expect(first?.post).toHaveBeenCalledTimes(1);
        const [route, options] = first?.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body.type).toBe(4);
    });

    it('hands waitUntil the execute continuation and returns 202 before the handler finishes', async () => {
        const { promise: gate, resolve: releaseExecute } = Promise.withResolvers<null>();
        let executeFinished = false;
        class Slow extends SlashHandler<never> {
            async execute(): Promise<void> {
                await gate;
                await this.reply('late');
                executeFinished = true;
            }
        }
        const manifest = {
            ...emptyManifest(),
            commands: [{ name: 'slow', type: 1, load: () => Promise.resolve({ Slow }) }]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('slow')), ctx);

        expect(response.status).toBe(202);
        expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
        expect(executeFinished).toBe(false);

        releaseExecute(null);
        await ctx.settled();
        expect(executeFinished).toBe(true);
        expect(rest.instances[0]?.post).toHaveBeenCalledTimes(1);
    });

    it('completes the handler without a ctx, tracking the work in flight', async () => {
        class Ping extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('pong');
            }
        }
        const manifest = {
            ...emptyManifest(),
            commands: [{ name: 'ping', type: 1, load: () => Promise.resolve({ Ping }) }]
        };
        const { signer, handle } = await readyEngine(manifest);

        const response = await handle(await signedRequest(signer, slashPayload('ping')));

        expect(response.status).toBe(202);
        await vi.waitFor(() => {
            expect(rest.instances[0]?.post).toHaveBeenCalledTimes(1);
        });
    });

    it('threads the resolved route id into the handler dispatch context', async () => {
        let seenRouteId: string | undefined;
        class Track extends SlashHandler<never> {
            async execute(): Promise<void> {
                seenRouteId = this.dispatch?.routeId ?? undefined;
                await this.reply('ok');
            }
        }
        const manifest = {
            ...emptyManifest(),
            commands: [{ name: 'track', type: 1, load: () => Promise.resolve({ Track }) }]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('track')), ctx);
        await ctx.settled();

        expect(seenRouteId).toBe('slash:track');
    });

    it('routes a signed button click by prefix to its component handler, whose update posts a type 7', async () => {
        class Approve extends ButtonHandler<never> {
            async execute(): Promise<void> {
                await this.update('approved');
            }
        }
        const approveId = new CustomId('approve').snowflake('userId');
        const manifest = {
            ...emptyManifest(),
            components: [{ kind: 'button' as const, prefix: 'approve', load: () => Promise.resolve({ Approve }) }]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const payload = {
            type: 3,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            data: { component_type: 2, custom_id: approveId.encode({ userId: '9' }) }
        };
        const response = await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        const [route, options] = rest.instances[0]?.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body.type).toBe(7);
    });

    it('acks a matched route whose module carries no handler class with a bare 202', async () => {
        const manifest = {
            ...emptyManifest(),
            commands: [{ name: 'ghost', type: 1, load: () => Promise.resolve({ notAHandler: 42 }) }]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('ghost')), ctx);

        expect(response.status).toBe(202);
        expect(ctx.waitUntil).not.toHaveBeenCalled();
        expect(rest.instances[0]?.post ?? vi.fn()).not.toHaveBeenCalled();
    });
});
