import { describe, expect, it } from 'vitest';

import type { EventMiddleware } from '@handlers/event/EventMiddleware';
import type { Events } from 'discord.js';

// justified: variance is the subject here, the members are never read
const single = null as unknown as EventMiddleware<Events.MessageCreate>;
const multi = null as unknown as EventMiddleware<Events.MessageCreate | Events.MessageUpdate>;

function takesMulti(_m: EventMiddleware<Events.MessageCreate | Events.MessageUpdate>): void {}
function takesSingle(_m: EventMiddleware<Events.MessageCreate>): void {}

describe('EventMiddleware variance', () => {
    // every member reads EventName in an output position, so the measured variance is covariant and the
    // fast path accepts this widening. the `in out` annotation forces the structural check, which catches
    // SingleEventPayload collapsing to never. dropping the annotation makes this line valid when it isn't
    it('rejects a single-event middleware where a multi-event one is expected', () => {
        // @ts-expect-error a single-event middleware reads this.event as a concrete tuple, never as a union
        takesMulti(single);

        expect(takesMulti).toBeTypeOf('function');
    });

    it('rejects a multi-event middleware where a single-event one is expected', () => {
        // @ts-expect-error the union does not satisfy the single event name
        takesSingle(multi);

        expect(takesSingle).toBeTypeOf('function');
    });

    it('accepts an exact match', () => {
        takesSingle(single);

        expect(takesSingle).toBeTypeOf('function');
    });
});
