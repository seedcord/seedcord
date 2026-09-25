import 'reflect-metadata';

import { TextDisplayBuilder } from '@discordjs/builders';
import { defineGate, InteractionKind, Notice, RegisterInteractionMiddleware } from '@seedcord/core';
import { GatedMetadataKey, interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '#src/dispatch/dispatchInteraction';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type { RenderableNotice, RenderContext, ReplyResponse } from '@seedcord/types';

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

// a bot names its own transport package here. both re-export the interface from @seedcord/types
declare module '@seedcord/types' {
    interface DispatchState {
        actor: string;
    }
}

const seen: (string | undefined)[] = [];

@RegisterInteractionMiddleware()
class Tagger extends InteractionMiddleware {
    public execute(): Promise<void> {
        this.dispatch.set('actor', 'from-middleware');
        return Promise.resolve();
    }
}

const ReadsDispatch = defineGate('ReadsDispatch', (ctx) => {
    seen.push(ctx.dispatch.get('actor'));
});

class GuardedHandler extends SlashHandler<never> {
    public async execute(): Promise<void> {
        await this.reply('done');
    }
}
Reflect.defineMetadata(GatedMetadataKey, [ReadsDispatch], GuardedHandler);

const rendered: (string | undefined)[] = [];

class TagNotice extends Notice {
    public constructor() {
        super('refused');
    }

    public render(ctx: RenderContext): ReplyResponse {
        rendered.push(ctx.dispatch.get('actor'));
        return { components: [new TextDisplayBuilder().setContent('nope')] };
    }
}

const RefusesWithNotice = defineGate('RefusesWithNotice', () => {
    throw new TagNotice();
});

class RefusedHandler extends SlashHandler<never> {
    public async execute(): Promise<void> {
        await this.reply('done');
    }
}
Reflect.defineMetadata(GatedMetadataKey, [RefusesWithNotice], RefusedHandler);

async function dispatchThrough(
    Handler: typeof GuardedHandler,
    ...ctors: InteractionMiddlewareConstructor[]
): Promise<void> {
    Envapter.useSource(new PortableSource({}));
    const middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
    for (const ctor of ctors) middlewares.register(ctor);

    const execute = await dispatchInteraction({
        match: { kind: InteractionKind.Slash, routeId: 'slash:guarded', ctor: Handler },
        payload: slashPayload('guarded') as ValidInteractionTypes,
        core: createCore(nullPathConfig, VALID_TOKEN),
        middlewares
    });
    await execute?.();
}

beforeEach(() => {
    seen.length = 0;
    rendered.length = 0;
});

describe('the dispatch context on an http gate', () => {
    it('hands a gate the same context the chain wrote to', async () => {
        await dispatchThrough(GuardedHandler, Tagger);

        expect(seen).toEqual(['from-middleware']);
    });

    it('leaves the key undefined when no middleware wrote it', async () => {
        await dispatchThrough(GuardedHandler);

        expect(seen).toEqual([undefined]);
    });
});

describe('the dispatch context on a rendered notice', () => {
    it('reaches the render of a notice a gate threw', async () => {
        await dispatchThrough(RefusedHandler, Tagger);

        expect(rendered).toEqual(['from-middleware']);
    });

    it('reaches the default card when the handler constructor throws', async () => {
        const routes: string[] = [];

        class RecordingCard implements RenderableNotice {
            public readonly report = true;

            public render(ctx: RenderContext): ReplyResponse {
                routes.push(ctx.dispatch.routeId);
                return { components: [new TextDisplayBuilder().setContent('failed')] };
            }
        }

        class Exploding extends SlashHandler<never> {
            constructor(event: never, core: Core, dispatch: DispatchContext) {
                super(event, core, dispatch);
                throw new Error('constructor blew up');
            }

            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        Envapter.useSource(new PortableSource({}));
        await dispatchInteraction({
            match: { kind: InteractionKind.Slash, routeId: 'slash:guarded', ctor: Exploding },
            payload: slashPayload('guarded') as ValidInteractionTypes,
            core: createCore({ ...nullPathConfig, errors: { defaultError: RecordingCard } }, VALID_TOKEN),
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
        });

        expect(routes).toEqual(['slash:guarded']);
    });
});
