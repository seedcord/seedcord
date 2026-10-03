import 'reflect-metadata';

import { Cooldown, InteractionKind } from '@seedcord/core';
import { GatedMetadataKey, interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '#src/dispatch/dispatchInteraction';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { SubscriptionData } from '@seedcord/core';

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

class Vote extends SlashHandler<never> {
    public async execute(): Promise<void> {
        await this.reply('counted');
    }
}
Reflect.defineMetadata(GatedMetadataKey, [Cooldown('10s')], Vote);

function freshCore(): { core: Core; published: SubscriptionData<'interactionDispatched'>[] } {
    Envapter.useSource(new PortableSource({}));
    const core = createCore(nullPathConfig, VALID_TOKEN);
    const published: SubscriptionData<'interactionDispatched'>[] = [];
    core.bus.on('interactionDispatched', (payload) => published.push(payload));
    return { core, published };
}

async function dispatchRoute(core: Core, routeId: string): Promise<void> {
    const execute = await dispatchInteraction({
        match: { kind: InteractionKind.Slash, routeId, ctor: Vote },
        payload: slashPayload('vote') as ValidInteractionTypes,
        core,
        middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
    });
    await execute?.();
}

describe('a gate keyed on the route the router matched', () => {
    it('cools down each route on its own', async () => {
        const { core, published } = freshCore();

        await dispatchRoute(core, 'slash:confirm');
        await dispatchRoute(core, 'slash:cancel');

        expect(published.map((entry) => entry.outcome)).toEqual(['handled', 'handled']);
    });

    it('still refuses a second run of the route that was already used', async () => {
        const { core, published } = freshCore();

        await dispatchRoute(core, 'slash:confirm');
        await dispatchRoute(core, 'slash:confirm');

        expect(published.map((entry) => entry.outcome)).toEqual(['handled', 'refused']);
    });
});
