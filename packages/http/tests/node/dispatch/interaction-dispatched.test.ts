import 'reflect-metadata';

import { defineGate, Fault, Silence } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '#src/dispatch/dispatchInteraction';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { ResolvedRoute } from '#src/dispatch/resolve';
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

class CtorSilentHandler extends SlashHandler<never> {
    constructor(...args: ConstructorParameters<typeof SlashHandler<never>>) {
        super(...args);
        throw new Silence('blocked');
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

class SearchAutocomplete extends AutocompleteHandler<never> {
    async execute(): Promise<void> {
        await this.respond([{ name: 'apple', value: 'apple' }]);
    }
}

// type 4 is an autocomplete, and resolve keys it off the same command data a slash carries
const autocompletePayload = (): object => ({ ...slashPayload('search'), type: 4 });

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
            interactionId: 'int-1',
            kind: 'slash',
            outcome: 'handled',
            fallback: false
        });
    });

    // an unmatched route carries no routeId, so the handler's own sender has none from the dispatch
    it('publishes one route id across both keys for an unmatched route', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = createCore(nullPathConfig, VALID_TOKEN);
        const dispatched: SubscriptionData<'interactionDispatched'>[] = [];
        const written: SubscriptionData<'responseAttempted'>[] = [];
        core.bus.on('interactionDispatched', (payload) => dispatched.push(payload));
        core.bus.on('responseAttempted', (payload) => written.push(payload));

        const match: ResolvedRoute = {
            kind: 'slash',
            routeId: null,
            attemptedKey: 'unregistered',
            load: () => Promise.resolve(OkHandler)
        };
        const execute = await dispatchInteraction({
            match,
            payload: slashPayload('ok') as ValidInteractionTypes,
            core
        });
        await execute?.();

        expect(dispatched[0]?.routeId).toBe('slash:unregistered');
        expect(written[0]?.routeId).toBe('slash:unregistered');
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

    // the type-based rule is the same on both transports, so a constructor Silence matches gateway
    it('reports refused when the handler constructor throws a Silence', async () => {
        const published = await dispatchedFor(routeFor('slash:ctorsilent', () => Promise.resolve(CtorSilentHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:ctorsilent', outcome: 'refused' });
    });

    it('reports failed when the handler constructor throws', async () => {
        const published = await dispatchedFor(routeFor('slash:ctorboom', () => Promise.resolve(CtorBoomHandler)));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:ctorboom', outcome: 'failed' });
    });

    // a customId seedcord never minted reads an empty key, which both transports render as unrouted
    it('names an unmintable customId unrouted', async () => {
        const match: ResolvedRoute = {
            kind: 'button',
            routeId: null,
            attemptedKey: '',
            load: () => Promise.resolve(OkHandler)
        };
        const published = await dispatchedFor(match);

        expect(published[0]).toMatchObject({ routeId: 'button:unrouted', fallback: true });
    });

    // the same shape gateway emits, so a dashboard can break unmatched routes down by command
    it('flags the unhandled default as a fallback and keeps the attempted key', async () => {
        const match: ResolvedRoute = {
            kind: 'slash',
            routeId: null,
            attemptedKey: 'unregistered',
            load: () => Promise.resolve(OkHandler)
        };
        const published = await dispatchedFor(match);

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:unregistered', fallback: true });
    });

    // the production buildSender wiring, so dropping core.bus from RepliableHandler fails here
    it('publishes responseAttempted from the handler own reply, carrying the route id', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = createCore(nullPathConfig, VALID_TOKEN);
        const sent: SubscriptionData<'responseAttempted'>[] = [];
        core.bus.on('responseAttempted', (payload) => sent.push(payload));

        const match = routeFor('slash:ok', () => Promise.resolve(OkHandler));
        const execute = await dispatchInteraction({
            match,
            payload: slashPayload('ok') as ValidInteractionTypes,
            core
        });
        await execute?.();

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({
            routeId: 'slash:ok',
            method: 'reply',
            outcome: 'sent',
            interactionId: 'int-1'
        });
    });

    // the choices callback bypasses the reply surface, so it reports through its own path
    it('publishes responseAttempted for an autocomplete choices response', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = createCore(nullPathConfig, VALID_TOKEN);
        const sent: SubscriptionData<'responseAttempted'>[] = [];
        core.bus.on('responseAttempted', (payload) => sent.push(payload));

        const match: ResolvedRoute = {
            kind: 'autocomplete',
            routeId: 'autocomplete:search',
            load: () => Promise.resolve(SearchAutocomplete)
        };
        const execute = await dispatchInteraction({
            match,
            payload: autocompletePayload() as ValidInteractionTypes,
            core
        });
        await execute?.();

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({
            routeId: 'autocomplete:search',
            interactionId: 'int-1',
            method: 'respond',
            outcome: 'sent',
            messageId: null
        });
    });

    it('reports a zero queue time for an id that is not a snowflake', async () => {
        const published = await dispatchedFor(routeFor('slash:ok', () => Promise.resolve(OkHandler)));

        // the harness payload id is 'int-1', so the snowflake read cannot resolve a timestamp
        expect(published[0]?.queuedMs).toBe(0);
    });
});
