import 'reflect-metadata';

import { defineGate, Fault, Silence } from '@seedcord/core';
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

class CtorBoomHandler extends SlashHandler<never> {
    constructor(...args: ConstructorParameters<typeof SlashHandler<never>>) {
        super(...args);
        throw new Error('ctor exploded');
    }

    async execute(): Promise<void> {
        await this.reply('done');
    }
}

class SilentHandler extends SlashHandler<never> {
    execute(): Promise<void> {
        throw new Silence('blacklisted');
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

class BrokenGateHandler extends SlashHandler<never> {
    async execute(): Promise<void> {
        await this.reply('done');
    }
}
Reflect.defineMetadata(
    GatedMetadataKey,
    [
        defineGate('Broken', () => {
            throw new Fault({ cause: new Error('permission lookup failed') });
        })
    ],
    BrokenGateHandler
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

    it('reports refused when the handler throws a Silence, which is a deliberate stop', async () => {
        const published = await dispatchedFor(routeFor('slash:silent', () => Promise.resolve(SilentHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:silent', outcome: 'refused' });
    });

    it('reports failed when a gate throws a reporting Fault, since the gate itself broke', async () => {
        const published = await dispatchedFor(routeFor('slash:brokengate', () => Promise.resolve(BrokenGateHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:brokengate', outcome: 'failed' });
    });

    it('reports failed when the route cannot load its handler', async () => {
        const published = await dispatchedFor(routeFor('slash:missing', () => Promise.reject(new Error('no module'))));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:missing', outcome: 'failed' });
    });

    it('reports failed when the route loads an export that is not a handler class', async () => {
        const published = await dispatchedFor(routeFor('slash:wrong', () => Promise.resolve({})));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:wrong', outcome: 'failed' });
    });

    it('reports failed when the handler constructor throws', async () => {
        const published = await dispatchedFor(routeFor('slash:ctorboom', () => Promise.resolve(CtorBoomHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:ctorboom', outcome: 'failed' });
    });

    it('flags the unhandled default as a fallback and keys the route by kind', async () => {
        const published = await dispatchedFor(routeFor(null, () => Promise.resolve(OkHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:unhandled', fallback: true });
    });

    // the production buildSender wiring, so dropping core.bus from RepliableHandler fails here
    it('publishes responseSent from the handler own reply, carrying the route id', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = createCore(nullPathConfig, VALID_TOKEN);
        const sent: SubscriptionData<'responseSent'>[] = [];
        core.bus.on('responseSent', (payload) => sent.push(payload));

        const match = routeFor('slash:ok', () => Promise.resolve(OkHandler));
        const execute = await dispatchInteraction({
            match,
            payload: slashPayload('ok') as ValidInteractionTypes,
            core
        });
        await execute?.();

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ routeId: 'slash:ok', method: 'reply' });
    });

    it('reports a zero queue time for an id that is not a snowflake', async () => {
        const published = await dispatchedFor(routeFor('slash:ok', () => Promise.resolve(OkHandler)));

        // the harness payload id is 'int-1', so the snowflake read cannot resolve a timestamp
        expect(published[0]?.queuedMs).toBe(0);
    });
});
