import { CustomId, InteractionKind, Subscribe, Subscriber } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { beforeEach, describe, expect, it } from 'vitest';

import { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { restClients } from '#tests/helpers/restClients';

import { capturingCtx, noClasses, readyEngine, routedHandler, signedRequest, slashPayload } from './harness';

import type { Core } from '#interfaces/Core';

beforeEach(() => {
    restClients().length = 0;
});

describe('waitUntil and subscribers', () => {
    const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

    interface Gate {
        wait: () => Promise<void>;
        finish: () => void;
        finished: () => boolean;
    }

    function gate(): Gate {
        const release = Promise.withResolvers<undefined>();
        let done = false;
        return {
            wait: async () => {
                await release.promise;
                done = true;
            },
            finish: () => release.resolve(undefined),
            finished: () => done
        };
    }

    it('stays open for a subscriber that a handler published to', async () => {
        const { wait, finish, finished } = gate();
        @Subscribe(['unhandledInteractionError'])
        class Slow extends Subscriber<'unhandledInteractionError', Core> {
            public execute(): Promise<void> {
                return wait();
            }
        }
        class Ban extends SlashHandler<never> {
            public async execute(): Promise<void> {
                this.core.bus[PublishDefault]('unhandledInteractionError', { error: new Error('boom') });
                await this.reply('done');
            }
        }
        const classes = routedHandler(InteractionKind.Slash, 'ban', Ban);
        using engine = await readyEngine({ ...classes, subscribers: [Slow] });
        const ctx = capturingCtx();
        let settled = false;

        await engine.handle(await signedRequest(engine.signer, slashPayload('ban')), ctx);
        const work = ctx.settled().then(() => {
            settled = true;
        });
        await tick();
        expect(settled).toBe(false);

        finish();
        await work;
        expect(finished()).toBe(true);
    });

    it('stays open for an anyInteraction subscriber when no route matches', async () => {
        const { wait, finish, finished } = gate();
        @Subscribe(['anyInteraction'])
        class Slow extends Subscriber<'anyInteraction', Core> {
            public execute(): Promise<void> {
                return wait();
            }
        }
        using engine = await readyEngine({ ...noClasses(), subscribers: [Slow] });
        const ctx = capturingCtx();
        let settled = false;

        await engine.handle(await signedRequest(engine.signer, slashPayload('nothing')), ctx);
        const work = ctx.settled().then(() => {
            settled = true;
        });
        await tick();
        expect(settled).toBe(false);

        finish();
        await work;
        expect(finished()).toBe(true);
    });
});

describe('engine dispatch', () => {
    it('routes a signed slash request to its handler, whose reply hits the interaction callback', async () => {
        class Ban extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('done');
            }
        }
        using engine = await readyEngine(routedHandler(InteractionKind.Slash, 'ban', Ban));
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('ban')), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        await expect(response.text()).resolves.toBe('');
        const first = restClients()[0];
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
        using engine = await readyEngine(routedHandler(InteractionKind.Slash, 'slow', Slow));
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('slow')), ctx);

        expect(response.status).toBe(202);
        expect(ctx.waitUntil).toHaveBeenCalled();
        expect(executeFinished).toBe(false);

        releaseExecute(null);
        await ctx.settled();
        expect(executeFinished).toBe(true);
        expect(restClients()[0]?.post).toHaveBeenCalledTimes(1);
    });

    it('threads the resolved route id into the handler dispatch context', async () => {
        let seenRouteId: string | undefined;
        class Track extends SlashHandler<never> {
            async execute(): Promise<void> {
                seenRouteId = this.dispatch.routeId;
                await this.reply('ok');
            }
        }
        using engine = await readyEngine(routedHandler(InteractionKind.Slash, 'track', Track));
        const { signer, handle } = engine;
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
        using engine = await readyEngine(routedHandler(InteractionKind.Button, 'approve', Approve));
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        const payload = {
            type: 3,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            app_permissions: '0',
            user: { id: 'u1', username: 'tester' },
            data: { component_type: 2, custom_id: approveId.encode({ userId: '9' }) }
        };
        const response = await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        const [route, options] = restClients()[0]?.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body.type).toBe(7);
    });

    it('dispatches an unmatched slash to the unhandled default, whose reply posts the card', async () => {
        using engine = await readyEngine(noClasses());
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('ghost')), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        const [route, options] = restClients()[0]?.post.mock.calls[0] as [
            string,
            { body: { type: number; data: { components: { content?: string }[] } } }
        ];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body.type).toBe(4);
        expect(options.body.data.components[0]?.content).toBe('Feature not implemented yet.');
    });

    it('answers an unmatched autocomplete through the unhandled default with empty choices', async () => {
        using engine = await readyEngine(noClasses());
        const { signer, handle } = engine;
        const payload = {
            type: 4,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            user: { id: 'u-1', username: 'someone' },
            data: { type: 1, name: 'ghost', options: [{ type: 3, name: 'q', value: 'x', focused: true }] }
        };
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        const [, options] = restClients()[0]?.post.mock.calls[0] as [
            string,
            { body: { type: number; data: { choices: unknown[] } } }
        ];
        expect(options.body.type).toBe(8);
        expect(options.body.data.choices).toEqual([]);
    });
});
