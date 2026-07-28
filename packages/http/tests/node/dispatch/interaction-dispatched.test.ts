import 'reflect-metadata';

import { defineGate, Silence } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '@handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '@src/dispatch/dispatchInteraction';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { ValidInteractionTypes } from '@handlers/interactionTypes';
import type { SubscriptionData } from '@seedcord/core';
import type { ResolvedRoute } from '@src/dispatch/resolve';

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

class OkHandler extends SlashHandler<never> {
    async execute(): Promise<void> {
        await this.reply('done');
    }
}

class BoomHandler extends SlashHandler<never> {
    execute(): Promise<void> {
        throw new Error('handler exploded');
    }
}

class GuardedHandler extends SlashHandler<never> {
    async execute(): Promise<void> {
        await this.reply('done');
    }
}
Reflect.defineMetadata(
    GatedMetadataKey,
    [
        defineGate('Block', () => {
            throw new Silence('blocked');
        })
    ],
    GuardedHandler
);

function routeFor(routeId: string | null, load: () => Promise<unknown>): ResolvedRoute {
    return { kind: 'slash', routeId, load };
}

async function dispatchedFor(route: ResolvedRoute): Promise<SubscriptionData<'interactionDispatched'>[]> {
    Envapter.useSource(new PortableSource({}));
    const core = createCore(nullPathConfig, VALID_TOKEN);
    const published: SubscriptionData<'interactionDispatched'>[] = [];
    core.bus.on('interactionDispatched', (payload) => published.push(payload));

    const payload = slashPayload('ok') as ValidInteractionTypes;
    const execute = await dispatchInteraction({ match: route, payload, core });
    await execute?.();
    return published;
}

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('interactionDispatched from the http dispatcher', () => {
    it('reports a handled dispatch with its route and no fallback', async () => {
        const published = await dispatchedFor(routeFor('slash:ok', () => Promise.resolve(OkHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({
            routeId: 'slash:ok',
            kind: 'slash',
            outcome: 'handled',
            fallback: false
        });
    });

    it('reports failed when the handler throws', async () => {
        const published = await dispatchedFor(routeFor('slash:boom', () => Promise.resolve(BoomHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:boom', outcome: 'failed' });
    });

    it('reports refused when a gate stops the handler', async () => {
        const published = await dispatchedFor(routeFor('slash:guarded', () => Promise.resolve(GuardedHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:guarded', outcome: 'refused' });
    });

    it('reports failed when the route cannot load its handler', async () => {
        const published = await dispatchedFor(routeFor('slash:missing', () => Promise.reject(new Error('no module'))));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:missing', outcome: 'failed' });
    });

    it('flags the unhandled default as a fallback and keys the route by kind', async () => {
        const published = await dispatchedFor(routeFor(null, () => Promise.resolve(OkHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:unhandled', fallback: true });
    });

    it('reports a zero queue time for an id that is not a snowflake', async () => {
        const published = await dispatchedFor(routeFor('slash:ok', () => Promise.resolve(OkHandler)));

        // the harness payload id is 'int-1', so the snowflake read cannot resolve a timestamp
        expect(published[0]?.queuedMs).toBe(0);
    });
});
