import { SeedcordErrorCode } from '@seedcord/errors';
import { Events } from 'discord.js';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { EventCatchable } from '@bDecorators/EventCatchable';
import { RegisterEvent } from '@bDecorators/Events';
import { EventHandler } from '@handlers/event';
import { Denial } from '@interfaces/Components';

import type { Core } from '@interfaces/Core';
import type { ReplyResponse } from '@seedcord/types';
import type { ClientEvents } from 'discord.js';

const core = {} as unknown as Core;

// a minimal Message-shaped fake, the arms only call reply on it
function fakeMessage(): { reply: ReturnType<typeof vi.fn> } {
    return { reply: vi.fn() };
}

// the message-event payload tuples are fakes, justified: match only reads getEvent() and hands the tuple to the arm
function createPayload(m: { reply: ReturnType<typeof vi.fn> }): ClientEvents[Events.MessageCreate] {
    return [m] as unknown as ClientEvents[Events.MessageCreate];
}

class PingMulti extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await this.match({
            [Events.MessageCreate]: (message) => {
                (message as unknown as { reply: (s: string) => void }).reply('created');
            },
            [Events.MessageUpdate]: (_oldMessage, newMessage) => {
                (newMessage as unknown as { reply: (s: string) => void }).reply('updated');
            }
        });
    }
}

// a single-event handler reads this.event as its concrete payload tuple
class SingleRead extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    read(): ClientEvents[Events.MessageCreate] {
        return this.event;
    }
}

// single-event this.event is the concrete tuple, multi-event this.event is never (forcing match)
class EventTypes extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<ClientEvents[Events.MessageCreate]>();
        await Promise.resolve();
    }
}

class MultiNever extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<never>();
        // @ts-expect-error this.event is never on a multi-event handler, branch with match instead.
        const [first] = this.event;
        void first;
        await Promise.resolve();
    }
}

// every registered event needs an arm
class MissingArm extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        // @ts-expect-error the messageUpdate arm is missing.
        await this.match({
            [Events.MessageCreate]: () => {
                /* noop */
            }
        });
    }
}

// each arm receives the event's payload as named params, so a param past the tuple's arity is a compile error
class ArmArity extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await this.match({
            // @ts-expect-error messageCreate delivers one element, a second param is rejected.
            [Events.MessageCreate]: (_message, _extra) => {
                /* noop */
            },
            [Events.MessageUpdate]: () => {
                /* noop */
            }
        });
    }
}

// each arm's named params are typed from the event's payload tuple, in order
class ArmParamTypes extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await this.match({
            [Events.MessageCreate]: (message) => {
                expectTypeOf(message).toEqualTypeOf<ClientEvents[Events.MessageCreate][0]>();
            },
            [Events.MessageUpdate]: (oldMessage, newMessage) => {
                expectTypeOf(oldMessage).toEqualTypeOf<ClientEvents[Events.MessageUpdate][0]>();
                expectTypeOf(newMessage).toEqualTypeOf<ClientEvents[Events.MessageUpdate][1]>();
            }
        });
    }
}

// @RegisterEvent and the EventHandler generic must agree, in both directions
@RegisterEvent([Events.MessageCreate])
class GoodSingle extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])
class GoodMulti extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the decorator registers an event the generic does not cover, the invariant generic catches this direction
// @ts-expect-error messageUpdate is listed on the decorator but not in the generic.
@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])
class DecoratorSuperset extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// the generic declares an event the decorator omits
// @ts-expect-error messageUpdate is in the generic but not listed on the decorator.
@RegisterEvent([Events.MessageCreate])
class GenericSuperset extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class BoomError extends Denial {
    constructor() {
        super('boom');
    }
    render(): ReplyResponse {
        return { kind: 'embed', embeds: [] };
    }
}

// match runs inside execute, so @EventCatchable still catches a throw from an arm
class ThrowingMulti extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    @EventCatchable()
    async execute(): Promise<void> {
        await this.match({
            [Events.MessageCreate]: () => {
                throw new BoomError();
            },
            [Events.MessageUpdate]: () => {
                /* noop */
            }
        });
    }
}

describe('EventHandler.match', () => {
    it('routes a throw from a match arm through @EventCatchable', async () => {
        const handler = new ThrowingMulti(createPayload(fakeMessage()), core, Events.MessageCreate);
        await handler.execute();
        expect(handler.hasErrors()).toBe(true);
    });

    it('cross-checks @RegisterEvent against the handler generic in both directions', () => {
        expect([GoodSingle, GoodMulti, DecoratorSuperset, GenericSuperset]).toHaveLength(4);
    });

    it('runs the arm for the fired event', async () => {
        const m = fakeMessage();
        await new PingMulti(createPayload(m), core, Events.MessageCreate).execute();
        expect(m.reply).toHaveBeenCalledWith('created');
    });

    it('routes by the fired event name, not the payload shape', async () => {
        const created = fakeMessage();
        await new PingMulti(createPayload(created), core, Events.MessageCreate).execute();
        expect(created.reply).toHaveBeenCalledWith('created');
        expect(created.reply).not.toHaveBeenCalledWith('updated');

        // messageUpdate carries [old, new], the same Message shape, proving the name is the discriminant
        const oldMsg = fakeMessage();
        const newMsg = fakeMessage();
        const updatePayload = [oldMsg, newMsg] as unknown as ClientEvents[Events.MessageCreate];
        await new PingMulti(updatePayload, core, 'messageUpdate' as Events.MessageCreate).execute();
        expect(newMsg.reply).toHaveBeenCalledWith('updated');
        expect(oldMsg.reply).not.toHaveBeenCalled();
    });

    it('reads this.event directly on a single-event handler', () => {
        const m = fakeMessage();
        const handler = new SingleRead(createPayload(m), core, Events.MessageCreate);
        expect(handler.read()).toHaveLength(1);
    });

    it('throws EventMatchArmMissing when the fired event has no arm', async () => {
        // a stale-deployed event arrives that the handler does not branch on
        const handler = new PingMulti(createPayload(fakeMessage()), core, 'ghost' as Events.MessageCreate);
        await expect(handler.execute()).rejects.toMatchObject({ code: SeedcordErrorCode.EventMatchArmMissing });
    });

    it('throws EventMatchArmMissing when constructed without an event name', async () => {
        const handler = new PingMulti(createPayload(fakeMessage()), core);
        await expect(handler.execute()).rejects.toMatchObject({ code: SeedcordErrorCode.EventMatchArmMissing });
    });

    it('exposes the type specs', () => {
        expect([EventTypes, MultiNever, MissingArm, ArmArity, ArmParamTypes]).toHaveLength(5);
    });
});
