import { CustomId } from '@seedcord/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import { FROM, capturingCtx, emptyManifest, readyEngine, signedRequest, slashPayload } from './harness';

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
            commandRoutes: [
                { name: 'ban', type: 1, exportName: 'Ban', from: FROM, load: () => Promise.resolve({ Ban }) }
            ]
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
            commandRoutes: [
                { name: 'slow', type: 1, exportName: 'Slow', from: FROM, load: () => Promise.resolve({ Slow }) }
            ]
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
            commandRoutes: [
                { name: 'ping', type: 1, exportName: 'Ping', from: FROM, load: () => Promise.resolve({ Ping }) }
            ]
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
            commandRoutes: [
                { name: 'track', type: 1, exportName: 'Track', from: FROM, load: () => Promise.resolve({ Track }) }
            ]
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
            componentRoutes: [
                {
                    kind: 'button' as const,
                    prefix: 'approve',
                    exportName: 'Approve',
                    from: FROM,
                    load: () => Promise.resolve({ Approve })
                }
            ]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const payload = {
            type: 3,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            app_permissions: '0',
            data: { component_type: 2, custom_id: approveId.encode({ userId: '9' }) }
        };
        const response = await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        const [route, options] = rest.instances[0]?.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body.type).toBe(7);
    });

    it('dispatches an unmatched slash to the unhandled default, whose reply posts the card', async () => {
        const { signer, handle } = await readyEngine(emptyManifest());
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('ghost')), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        const [route, options] = rest.instances[0]?.post.mock.calls[0] as [
            string,
            { body: { type: number; data: { components: { content?: string }[] } } }
        ];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body.type).toBe(4);
        expect(options.body.data.components[0]?.content).toBe('Feature not implemented yet.');
    });

    it('answers an unmatched autocomplete through the unhandled default with empty choices', async () => {
        const { signer, handle } = await readyEngine(emptyManifest());
        const payload = {
            type: 4,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            data: { type: 1, name: 'ghost', options: [{ type: 3, name: 'q', value: 'x', focused: true }] }
        };
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        const [, options] = rest.instances[0]?.post.mock.calls[0] as [
            string,
            { body: { type: number; data: { choices: unknown[] } } }
        ];
        expect(options.body.type).toBe(8);
        expect(options.body.data.choices).toEqual([]);
    });

    it('sends the fault card when a matched module carries no handler class, still acking 202', async () => {
        const manifest = {
            ...emptyManifest(),
            commandRoutes: [
                {
                    name: 'ghost',
                    type: 1,
                    exportName: 'notAHandler',
                    from: FROM,
                    load: () => Promise.resolve({ notAHandler: 42 })
                }
            ]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('ghost')), ctx);

        expect(response.status).toBe(202);
        expect(ctx.waitUntil).not.toHaveBeenCalled();
        const [, options] = (rest.instances[0]?.post.mock.calls[0] ?? []) as [string, { body: { type: number } }];
        expect(options.body.type).toBe(4);
    });
});
