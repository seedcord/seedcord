import 'reflect-metadata';

import { defineGate, Fault, InteractionKind, RegisterInteractionMiddleware, Silence } from '@seedcord/core';
import { GatedMetadataKey, interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '#src/dispatch/dispatchInteraction';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
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

const ran: string[] = [];

@RegisterInteractionMiddleware()
class Audit extends InteractionMiddleware {
    public async execute(): Promise<void> {
        ran.push('Audit');
        await Promise.resolve();
    }
}

@RegisterInteractionMiddleware()
class Defers extends InteractionMiddleware {
    public async execute(): Promise<void> {
        await this.defer();
    }
}

@RegisterInteractionMiddleware()
class Refuses extends InteractionMiddleware {
    public execute(): Promise<void> {
        throw new Silence('blocked by middleware');
    }
}

@RegisterInteractionMiddleware({ kinds: [InteractionKind.Button] })
class ButtonOnly extends InteractionMiddleware<InteractionKind.Button> {
    public async execute(): Promise<void> {
        ran.push('ButtonOnly');
        await Promise.resolve();
    }
}

// type 4 is an autocomplete, and resolve keys it off the same command data a slash carries
const autocompletePayload = (): object => ({ ...slashPayload('search'), type: 4 });

function routeFor(routeId: string | null, ctor: HandlerConstructor): ResolvedRoute {
    return { kind: InteractionKind.Slash, routeId, ctor };
}

async function dispatchedFor(route: ResolvedRoute): Promise<SubscriptionData<'interactionDispatched'>[]> {
    Envapter.useSource(new PortableSource({}));
    const core = createCore(nullPathConfig, VALID_TOKEN);
    const published: SubscriptionData<'interactionDispatched'>[] = [];
    core.bus.on('interactionDispatched', (payload) => published.push(payload));

    const payload = slashPayload('ok') as ValidInteractionTypes;
    const execute = await dispatchInteraction({
        match: route,
        payload,
        core,
        middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
    });
    await execute?.();
    return published;
}

async function dispatchedThrough(middleware: InteractionMiddlewareConstructor): Promise<{
    execute: (() => Promise<void>) | null;
    published: SubscriptionData<'interactionDispatched'>[];
}> {
    Envapter.useSource(new PortableSource({}));
    const core = createCore(nullPathConfig, VALID_TOKEN);
    const published: SubscriptionData<'interactionDispatched'>[] = [];
    core.bus.on('interactionDispatched', (payload) => published.push(payload));

    const middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
    middlewares.register(middleware);

    const execute = await dispatchInteraction({
        match: routeFor('slash:ok', OkHandler),
        payload: slashPayload('ok') as ValidInteractionTypes,
        core,
        middlewares
    });
    return { execute, published };
}

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
    ran.length = 0;
});

describe('interactionDispatched from the http dispatcher', () => {
    it('reports a handled dispatch with its route and no fallback', async () => {
        const published = await dispatchedFor(routeFor('slash:ok', OkHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({
            routeId: 'slash:ok',
            interactionId: 'int-1',
            kind: 'slash',
            outcome: 'handled',
            fallback: false,
            userId: 'u1',
            guildId: null
        });
    });

    it('runs a registered middleware on a matching dispatch', async () => {
        const { execute, published } = await dispatchedThrough(Audit);
        await execute?.();

        expect(ran).toEqual(['Audit']);
        expect(published[0]).toMatchObject({ routeId: 'slash:ok', outcome: 'handled' });
    });

    it('shares one ack state between the chain and the handler', async () => {
        // a reply() after the chain's defer() is illegal on one shared sender
        const { execute, published } = await dispatchedThrough(Defers);
        await execute?.();

        expect(published[0]).toMatchObject({ routeId: 'slash:ok', outcome: 'failed' });
    });

    it('answers a Notice thrown from the chain the way a gate refusal answers', async () => {
        const { execute, published } = await dispatchedThrough(Refuses);

        expect(execute).toBeNull();
        expect(published[0]).toMatchObject({ routeId: 'slash:ok', outcome: 'refused' });
    });

    it('skips a middleware whose kinds omit the dispatched kind', async () => {
        // justified: the chain only builds a kind-filtered middleware for the kind its ctor accepts
        const { execute } = await dispatchedThrough(ButtonOnly as InteractionMiddlewareConstructor);
        await execute?.();

        expect(ran).toEqual([]);
    });

    it('reads the actor off member.user in a guild', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = createCore(nullPathConfig, VALID_TOKEN);
        const published: SubscriptionData<'interactionDispatched'>[] = [];
        core.bus.on('interactionDispatched', (payload) => published.push(payload));

        const payload = {
            ...slashPayload('ok'),
            user: undefined,
            member: { user: { id: 'guild-user', username: 'tester' } },
            guild_id: 'g1'
        } as unknown as ValidInteractionTypes;

        const execute = await dispatchInteraction({
            match: routeFor('slash:ok', OkHandler),
            payload,
            core,
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
        });
        await execute?.();

        expect(published[0]).toMatchObject({ userId: 'guild-user', guildId: 'g1' });
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
            kind: InteractionKind.Slash,
            routeId: null,
            attemptedKey: 'unregistered',
            ctor: OkHandler
        };
        const execute = await dispatchInteraction({
            match,
            payload: slashPayload('ok') as ValidInteractionTypes,
            core,
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
        });
        await execute?.();

        expect(dispatched[0]?.routeId).toBe('slash:unregistered');
        expect(written[0]?.routeId).toBe('slash:unregistered');
    });

    it('reports failed when the handler throws', async () => {
        const published = await dispatchedFor(routeFor('slash:boom', BoomHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:boom', outcome: 'failed' });
    });

    it('reports refused when a gate stops the handler', async () => {
        const published = await dispatchedFor(routeFor('slash:guarded', GuardedHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:guarded', outcome: 'refused' });
    });

    it('reports refused when the handler throws a Silence, which is a deliberate stop', async () => {
        const published = await dispatchedFor(routeFor('slash:silent', SilentHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:silent', outcome: 'refused' });
    });

    it('reports failed when a gate throws a reporting Fault, since the gate itself broke', async () => {
        const published = await dispatchedFor(routeFor('slash:brokengate', BrokenGateHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:brokengate', outcome: 'failed' });
    });

    // the type-based rule is the same on both transports, so a constructor Silence matches gateway
    it('reports refused when the handler constructor throws a Silence', async () => {
        const published = await dispatchedFor(routeFor('slash:ctorsilent', CtorSilentHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:ctorsilent', outcome: 'refused' });
    });

    it('reports failed when the handler constructor throws', async () => {
        const published = await dispatchedFor(routeFor('slash:ctorboom', CtorBoomHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:ctorboom', outcome: 'failed' });
    });

    // a customId seedcord never minted reads an empty key, which both transports render as unrouted
    it('names an unmintable customId unrouted', async () => {
        const match: ResolvedRoute = {
            kind: InteractionKind.Button,
            routeId: null,
            attemptedKey: '',
            ctor: OkHandler
        };
        const published = await dispatchedFor(match);

        expect(published[0]).toMatchObject({ routeId: 'button:unrouted', fallback: true });
    });

    // the same shape gateway emits
    it('flags the unhandled default as a fallback and keeps the attempted key', async () => {
        const match: ResolvedRoute = {
            kind: InteractionKind.Slash,
            routeId: null,
            attemptedKey: 'unregistered',
            ctor: OkHandler
        };
        const published = await dispatchedFor(match);

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:unregistered', fallback: true });
    });

    it('publishes responseAttempted from the handler own reply, carrying the route id', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = createCore(nullPathConfig, VALID_TOKEN);
        const sent: SubscriptionData<'responseAttempted'>[] = [];
        core.bus.on('responseAttempted', (payload) => sent.push(payload));

        const match = routeFor('slash:ok', OkHandler);
        const execute = await dispatchInteraction({
            match,
            payload: slashPayload('ok') as ValidInteractionTypes,
            core,
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
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
            kind: InteractionKind.Autocomplete,
            routeId: 'autocomplete:search',
            ctor: SearchAutocomplete
        };
        const execute = await dispatchInteraction({
            match,
            payload: autocompletePayload() as ValidInteractionTypes,
            core,
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
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
        const published = await dispatchedFor(routeFor('slash:ok', OkHandler));

        // the harness payload id is 'int-1', so the snowflake read cannot resolve a timestamp
        expect(published[0]?.queuedMs).toBe(0);
    });
});
