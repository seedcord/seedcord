import 'reflect-metadata';

import { defineGate, Fault, InteractionKind, RegisterInteractionMiddleware, Silence } from '@seedcord/core';
import { GatedMetadataKey, interactionMiddleware, MiddlewareRegistry } from '@seedcord/core/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';
import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { dispatchInteraction } from '#src/dispatch/dispatchInteraction';
import { testCore } from '#tests/helpers/core';
import { nullPathConfig, VALID_TOKEN } from '#tests/helpers/fixtures';
import { resolvedSlash } from '#tests/helpers/interactions';

import { slashPayload } from './harness';

import type { InteractionMiddlewareConstructor, ResolvedInteraction } from '#handlers/constructors';
import type { SubscriptionData } from '@seedcord/core';
import type {
    APIApplicationCommandAutocompleteInteraction,
    APIMessageComponentButtonInteraction
} from 'discord-api-types/v10';

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

// type 4 is an autocomplete, and resolve keys it off the same command data a slash has
const autocompletePayload = (): object => ({ ...slashPayload('search'), type: 4 });

async function dispatchedFor(resolved: ResolvedInteraction): Promise<SubscriptionData<'interactionDispatched'>[]> {
    Envapter.useSource(new PortableSource({}));
    const core = testCore(nullPathConfig, VALID_TOKEN);
    const published: SubscriptionData<'interactionDispatched'>[] = [];
    core.bus.on('interactionDispatched', (payload) => published.push(payload));

    const execute = await dispatchInteraction({
        resolved,
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
    const core = testCore(nullPathConfig, VALID_TOKEN);
    const published: SubscriptionData<'interactionDispatched'>[] = [];
    core.bus.on('interactionDispatched', (payload) => published.push(payload));

    const middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
    middlewares.register(middleware);

    const execute = await dispatchInteraction({ resolved: resolvedSlash('ok', OkHandler), core, middlewares });
    return { execute, published };
}

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
    ran.length = 0;
});

describe('interactionDispatched from the http dispatcher', () => {
    it('reports a handled dispatch with its route and no fallback', async () => {
        const published = await dispatchedFor(resolvedSlash('ok', OkHandler));

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
        const core = testCore(nullPathConfig, VALID_TOKEN);
        const published: SubscriptionData<'interactionDispatched'>[] = [];
        core.bus.on('interactionDispatched', (payload) => published.push(payload));

        const payload = {
            ...slashPayload('ok'),
            user: undefined,
            member: { user: { id: 'guild-user', username: 'tester' } },
            guild_id: 'g1'
        };

        const execute = await dispatchInteraction({
            resolved: resolvedSlash('ok', OkHandler, payload),
            core,
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
        });
        await execute?.();

        expect(published[0]).toMatchObject({ userId: 'guild-user', guildId: 'g1' });
    });

    it('flags an unmatched route as a fallback and publishes one route id across both keys', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = testCore(nullPathConfig, VALID_TOKEN);
        const dispatched: SubscriptionData<'interactionDispatched'>[] = [];
        const written: SubscriptionData<'responseAttempted'>[] = [];
        core.bus.on('interactionDispatched', (payload) => dispatched.push(payload));
        core.bus.on('responseAttempted', (payload) => written.push(payload));

        const execute = await dispatchInteraction({
            resolved: { ...resolvedSlash('unregistered', OkHandler, slashPayload('ok')), fallback: true },
            core,
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware)
        });
        await execute?.();

        expect(dispatched).toHaveLength(1);
        expect(dispatched[0]).toMatchObject({ routeId: 'slash:unregistered', fallback: true });
        expect(written[0]?.routeId).toBe('slash:unregistered');
    });

    it('reports failed when the handler throws', async () => {
        const published = await dispatchedFor(resolvedSlash('boom', BoomHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:boom', outcome: 'failed' });
    });

    it('reports refused when a gate stops the handler', async () => {
        const published = await dispatchedFor(resolvedSlash('guarded', GuardedHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:guarded', outcome: 'refused' });
    });

    it('reports refused when the handler throws a Silence, which is a deliberate stop', async () => {
        const published = await dispatchedFor(resolvedSlash('silent', SilentHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:silent', outcome: 'refused' });
    });

    it('reports failed when a gate throws a reporting Fault, since the gate itself broke', async () => {
        const published = await dispatchedFor(resolvedSlash('brokengate', BrokenGateHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:brokengate', outcome: 'failed' });
    });

    // a constructor Silence matches gateway because the type-based rule is the same on both transports
    it('reports refused when the handler constructor throws a Silence', async () => {
        const published = await dispatchedFor(resolvedSlash('ctorsilent', CtorSilentHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:ctorsilent', outcome: 'refused' });
    });

    it('reports failed when the handler constructor throws', async () => {
        const published = await dispatchedFor(resolvedSlash('ctorboom', CtorBoomHandler));

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({ routeId: 'slash:ctorboom', outcome: 'failed' });
    });

    // a customId that seedcord never minted reads an empty key, which both transports render as unrouted
    it('labels an unmintable customId unrouted', async () => {
        // justified: a slash payload with a button's type and data has every field that the dispatch reads
        const event = {
            ...slashPayload('ok'),
            type: 3,
            data: { component_type: 2, custom_id: 'not-minted' }
        } as unknown as APIMessageComponentButtonInteraction;
        const published = await dispatchedFor({
            kind: InteractionKind.Button,
            route: '',
            fallback: true,
            ctor: UnhandledRepliable,
            event
        });

        expect(published[0]).toMatchObject({ routeId: 'button:unrouted', fallback: true });
    });

    it('publishes responseAttempted from the handler own reply, carrying the route id', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = testCore(nullPathConfig, VALID_TOKEN);
        const sent: SubscriptionData<'responseAttempted'>[] = [];
        core.bus.on('responseAttempted', (payload) => sent.push(payload));

        const execute = await dispatchInteraction({
            resolved: resolvedSlash('ok', OkHandler),
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

    // the choices callback reports through its own path. it bypasses the reply surface
    it('publishes responseAttempted for an autocomplete choices response', async () => {
        Envapter.useSource(new PortableSource({}));
        const core = testCore(nullPathConfig, VALID_TOKEN);
        const sent: SubscriptionData<'responseAttempted'>[] = [];
        core.bus.on('responseAttempted', (payload) => sent.push(payload));

        const execute = await dispatchInteraction({
            resolved: {
                kind: InteractionKind.Autocomplete,
                route: 'search',
                fallback: false,
                ctor: SearchAutocomplete,
                // justified: a slash payload with the autocomplete type has every field that the dispatch reads
                event: autocompletePayload() as APIApplicationCommandAutocompleteInteraction
            },
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
        const published = await dispatchedFor(resolvedSlash('ok', OkHandler));

        // the snowflake read cannot resolve a timestamp because the harness payload id is 'int-1'
        expect(published[0]?.queuedMs).toBe(0);
    });
});
