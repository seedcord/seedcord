import 'reflect-metadata';

import { defineGate, InteractionKind, Notice, RegisterInteractionMiddleware, Silence } from '@seedcord/core';
import { GatedMetadataKey, interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '#src/dispatch/dispatchInteraction';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { DispatchResult } from '@seedcord/core';
import type { ReplyResponse } from '@seedcord/types';

vi.mock('@discordjs/rest', async (importOriginal) => {
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public setToken(): this {
            return this;
        }
    }
    return { ...(await importOriginal<object>()), REST: FakeRest };
});

const calls: string[] = [];
const results: DispatchResult[] = [];

@RegisterInteractionMiddleware({ priority: 1 })
class First extends InteractionMiddleware {
    public async execute(): Promise<void> {
        calls.push('First.execute');
        await Promise.resolve();
    }

    public override async after(result: DispatchResult): Promise<void> {
        calls.push('First.after');
        results.push(result);
        await Promise.resolve();
    }
}

@RegisterInteractionMiddleware({ priority: 2 })
class Second extends InteractionMiddleware {
    public async execute(): Promise<void> {
        calls.push('Second.execute');
        await Promise.resolve();
    }

    public override async after(): Promise<void> {
        calls.push('Second.after');
        await Promise.resolve();
    }
}

class OkHandler extends SlashHandler<never> {
    async execute(): Promise<void> {
        await this.reply('done');
    }
}

function registry(...ctors: InteractionMiddlewareConstructor[]): MiddlewareRegistry<InteractionMiddlewareConstructor> {
    const middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
    for (const ctor of ctors) middlewares.register(ctor);
    return middlewares;
}

async function dispatchThrough(ctor: HandlerConstructor, ...ctors: InteractionMiddlewareConstructor[]): Promise<void> {
    Envapter.useSource(new PortableSource({}));
    const core = createCore(nullPathConfig, VALID_TOKEN);

    const execute = await dispatchInteraction({
        match: { kind: InteractionKind.Slash, routeId: 'slash:ok', ctor },
        payload: slashPayload('ok') as ValidInteractionTypes,
        core,
        middlewares: registry(...ctors)
    });
    await execute?.();
}

beforeEach(() => {
    calls.length = 0;
    results.length = 0;
});

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('after() on the http interaction chain', () => {
    it('runs after the handler, in reverse of the chain', async () => {
        await dispatchThrough(OkHandler, First, Second);

        expect(calls).toEqual(['First.execute', 'Second.execute', 'Second.after', 'First.after']);
    });

    it('reports a handled dispatch', async () => {
        await dispatchThrough(OkHandler, First);

        expect(results).toEqual([{ outcome: 'handled' }]);
    });

    it('carries the thrown value when the handler throws', async () => {
        const boom = new Error('handler exploded');
        class BoomHandler extends SlashHandler<never> {
            execute(): Promise<void> {
                throw boom;
            }
        }

        await dispatchThrough(BoomHandler, First);

        expect(results).toEqual([{ outcome: 'failed', caught: boom }]);
    });

    it('reports refused when a middleware later in the chain stops the dispatch', async () => {
        const stop = new Silence('blocked');

        @RegisterInteractionMiddleware({ priority: 5 })
        class Stops extends InteractionMiddleware {
            public execute(): Promise<void> {
                throw stop;
            }
        }

        await dispatchThrough(OkHandler, First, Stops);

        expect(results).toEqual([{ outcome: 'refused', caught: stop }]);
    });

    it('gives the middleware that threw its own after()', async () => {
        @RegisterInteractionMiddleware({ priority: 5 })
        class StopsLoudly extends InteractionMiddleware {
            public execute(): Promise<void> {
                throw new Silence('blocked');
            }

            public override async after(): Promise<void> {
                calls.push('StopsLoudly.after');
                await Promise.resolve();
            }
        }

        await dispatchThrough(OkHandler, First, StopsLoudly);

        expect(calls).toEqual(['First.execute', 'StopsLoudly.after', 'First.after']);
    });

    // answer() runs the user's render() between the refusal and the after() calls
    it('still runs after() when rendering the refusal throws', async () => {
        class ExplodingNotice extends Notice {
            public constructor() {
                super('refused');
            }

            public render(): ReplyResponse {
                throw new Error('render exploded');
            }
        }

        const refuse = defineGate('refuse', () => {
            throw new ExplodingNotice();
        });

        class GatedHandler extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply('never');
            }
        }
        Reflect.defineMetadata(GatedMetadataKey, [refuse], GatedHandler);

        await expect(dispatchThrough(GatedHandler, First)).rejects.toThrow('render exploded');

        expect(calls).toContain('First.after');
    });

    it('keeps going when one after() throws', async () => {
        @RegisterInteractionMiddleware({ priority: 3 })
        class Angry extends InteractionMiddleware {
            public execute(): Promise<void> {
                return Promise.resolve();
            }

            public override after(): Promise<void> {
                throw new Error('after exploded');
            }
        }

        await dispatchThrough(OkHandler, First, Angry);

        expect(calls).toContain('First.after');
    });
});
