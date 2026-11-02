import { RegisterInteractionMiddleware } from '@seedcord/core';
import { DispatchContext } from '@seedcord/core/internal';
import { Events } from 'discord.js';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { RegisterEventMiddleware } from '#bDecorators/Middlewares';
import { EventMiddleware } from '#handlers/event';
import { InteractionMiddleware } from '#handlers/interaction';

import type { Core } from '#interfaces/Core';
import type { ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { ClientEvents } from 'discord.js';

const core = {} as unknown as Core;
const dispatch = new DispatchContext('event', Events.MessageCreate);

function fakeMessage(): { reply: ReturnType<typeof vi.fn> } {
    return { reply: vi.fn() };
}

// the payload tuple is a fake, justified: the middleware only reads this.event/this.route, never Discord internals
function createPayload(m: { reply: ReturnType<typeof vi.fn> }): ClientEvents[Events.MessageCreate] {
    return [m] as unknown as ClientEvents[Events.MessageCreate];
}

// a single-event middleware reads this.event as the concrete tuple and this.route as the current event name
class SingleMw extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    readEvent(): ClientEvents[Events.MessageCreate] {
        return this.event;
    }
    readName(): Events.MessageCreate {
        return this.route;
    }
}

// the classes below are compiled and never run

class SingleType extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<ClientEvents[Events.MessageCreate]>();
        expectTypeOf(this.route).toEqualTypeOf<Events.MessageCreate>();
        await Promise.resolve();
    }
}
void SingleType;

class MultiType extends EventMiddleware<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<never>();
        // @ts-expect-error this.event is never on a multi-event middleware, read this.route instead.
        const [first] = this.event;
        void first;
        await Promise.resolve();
    }
}
void MultiType;

class CatchallType extends EventMiddleware {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<never>();
        expectTypeOf(this.route).toEqualTypeOf<ValidNonInteractionKeys>();
        await Promise.resolve();
    }
}
void CatchallType;

describe('EventMiddleware', () => {
    it('reads the current event name from the dispatch', () => {
        const mw = new SingleMw(createPayload(fakeMessage()), core, dispatch);
        expect(mw.readName()).toBe(Events.MessageCreate);
    });

    it('reads this.event as the concrete tuple on a single-event middleware', () => {
        const mw = new SingleMw(createPayload(fakeMessage()), core, dispatch);
        expect(mw.readEvent()).toHaveLength(1);
    });
});

// @RegisterEventMiddleware and the EventMiddleware generic must agree, in both directions

@RegisterEventMiddleware()
class GoodCatchall extends EventMiddleware {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void GoodCatchall;

@RegisterEventMiddleware({ events: [Events.MessageCreate] })
class GoodSingle extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void GoodSingle;

@RegisterEventMiddleware({ events: [Events.MessageCreate, Events.MessageUpdate] })
class GoodMulti extends EventMiddleware<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void GoodMulti;

// the generic lists an event that { events } leaves out
// @ts-expect-error events lists messageCreate, the generic is guildMemberAdd
@RegisterEventMiddleware({ events: [Events.MessageCreate] })
class BadMismatch extends EventMiddleware<Events.GuildMemberAdd> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void BadMismatch;

// { events } is a superset of the generic
// @ts-expect-error events lists messageUpdate, the generic omits it
@RegisterEventMiddleware({ events: [Events.MessageCreate, Events.MessageUpdate] })
class BadNarrowGeneric extends EventMiddleware<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void BadNarrowGeneric;

// the generic is a superset of { events }
// @ts-expect-error the generic lists guildMemberAdd, { events } omits it
@RegisterEventMiddleware({ events: [Events.MessageCreate] })
class BadWideGeneric extends EventMiddleware<Events.MessageCreate | Events.GuildMemberAdd> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void BadWideGeneric;

@RegisterInteractionMiddleware()
class GoodInteraction extends InteractionMiddleware {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void GoodInteraction;
