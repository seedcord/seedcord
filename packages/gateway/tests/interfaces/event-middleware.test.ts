import { SeedcordErrorCode } from '@seedcord/errors';
import { Events } from 'discord.js';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { Middleware, MiddlewareType } from '@bDecorators/Middlewares';
import { EventMiddleware } from '@handlers/event';
import { InteractionMiddleware } from '@handlers/interaction';

import type { Repliables, ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ClientEvents } from 'discord.js';

const core = {} as unknown as Core;

function fakeMessage(): { reply: ReturnType<typeof vi.fn> } {
    return { reply: vi.fn() };
}

// the payload tuple is a fake, justified: the middleware only reads this.event/this.eventName, never Discord internals
function createPayload(m: { reply: ReturnType<typeof vi.fn> }): ClientEvents[Events.MessageCreate] {
    return [m] as unknown as ClientEvents[Events.MessageCreate];
}

// a single-event middleware reads this.event as the concrete tuple and this.eventName as the fired name
class SingleMw extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    readEvent(): ClientEvents[Events.MessageCreate] {
        return this.event;
    }
    readName(): Events.MessageCreate {
        return this.eventName;
    }
}

// a catchall middleware (no generic) reads only this.eventName, this.event is never
class CatchallMw extends EventMiddleware {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    readName(): ValidNonInteractionKeys {
        return this.eventName;
    }
}

// --- type specs (compiled, never run) ---

class SingleType extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<ClientEvents[Events.MessageCreate]>();
        expectTypeOf(this.eventName).toEqualTypeOf<Events.MessageCreate>();
        await Promise.resolve();
    }
}

class MultiType extends EventMiddleware<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<never>();
        // @ts-expect-error this.event is never on a multi-event middleware, read this.eventName instead.
        const [first] = this.event;
        void first;
        await Promise.resolve();
    }
}

class CatchallType extends EventMiddleware {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<never>();
        expectTypeOf(this.eventName).toEqualTypeOf<ValidNonInteractionKeys>();
        await Promise.resolve();
    }
}

describe('EventMiddleware', () => {
    it('threads the fired event name into the ctor', () => {
        const mw = new SingleMw(createPayload(fakeMessage()), core, Events.MessageCreate);
        expect(mw.readName()).toBe(Events.MessageCreate);
    });

    it('reads this.event as the concrete tuple on a single-event middleware', () => {
        const mw = new SingleMw(createPayload(fakeMessage()), core, Events.MessageCreate);
        expect(mw.readEvent()).toHaveLength(1);
    });

    it('exposes the fired name on a catchall middleware', () => {
        const mw = new CatchallMw(createPayload(fakeMessage()), core, Events.MessageCreate);
        expect(mw.readName()).toBe(Events.MessageCreate);
    });

    it('throws when the fired event name is unavailable', () => {
        const mw = new SingleMw(createPayload(fakeMessage()), core);
        expect(() => mw.readName()).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.EventMiddlewareNameUnavailable })
        );
    });

    it('exposes the type specs', () => {
        expect([SingleType, MultiType, CatchallType]).toHaveLength(3);
    });
});

// --- @Middleware <-> EventMiddleware generic cross-check (compile-time) ---

@Middleware(MiddlewareType.Event, 0)
class GoodCatchall extends EventMiddleware {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

@Middleware(MiddlewareType.Event, 0, { events: [Events.MessageCreate] })
class GoodSingle extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

@Middleware(MiddlewareType.Event, 0, { events: [Events.MessageCreate, Events.MessageUpdate] })
class GoodMulti extends EventMiddleware<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the generic names an event { events } omits
// @ts-expect-error events lists messageCreate, the generic is guildMemberAdd
@Middleware(MiddlewareType.Event, 0, { events: [Events.MessageCreate] })
class BadMismatch extends EventMiddleware<Events.GuildMemberAdd> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// { events } is a superset of the generic
// @ts-expect-error events lists messageUpdate, the generic omits it
@Middleware(MiddlewareType.Event, 0, { events: [Events.MessageCreate, Events.MessageUpdate] })
class BadNarrowGeneric extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the generic is a superset of { events }
// @ts-expect-error the generic lists guildMemberAdd, { events } omits it
@Middleware(MiddlewareType.Event, 0, { events: [Events.MessageCreate] })
class BadWideGeneric extends EventMiddleware<Events.MessageCreate | Events.GuildMemberAdd> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// interaction middleware is unchanged, catchall over Repliables, no events
@Middleware(MiddlewareType.Interaction, 0)
class GoodInteraction extends InteractionMiddleware<Repliables> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

describe('Middleware event cross-check', () => {
    it('accepts an EventMiddleware whose generic matches { events }, in both directions and catchall', () => {
        expect([GoodCatchall, GoodSingle, GoodMulti, BadMismatch, BadNarrowGeneric, BadWideGeneric]).toHaveLength(6);
    });

    it('leaves interaction middleware unchanged', () => {
        expect(GoodInteraction).toBeDefined();
    });

    it('rejects event filters on interaction middleware at decoration time', () => {
        expect(() => {
            // justified: a JS consumer without types passing events to interaction middleware, the cast mimics that
            @Middleware(MiddlewareType.Interaction, 0, { events: [Events.MessageCreate] } as never)
            class Bad extends InteractionMiddleware<Repliables> {
                async execute(): Promise<void> {
                    await Promise.resolve();
                }
            }
            void Bad;
        }).toThrow(expect.objectContaining({ code: SeedcordErrorCode.DecoratorInteractionEventFilter }));
    });
});
