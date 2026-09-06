import type { EventHandler } from '#handlers/event/EventHandler';
import type { EventMiddleware } from '#handlers/event/EventMiddleware';
import type { Events } from 'discord.js';

// justified: variance is the subject here, the members are never read
const singleMw = null as unknown as EventMiddleware<Events.MessageCreate>;
const multiMw = null as unknown as EventMiddleware<Events.MessageCreate | Events.MessageUpdate>;
const singleHandler = null as unknown as EventHandler<Events.MessageCreate>;
const multiHandler = null as unknown as EventHandler<Events.MessageCreate | Events.MessageUpdate>;

function takesMultiMw(_m: EventMiddleware<Events.MessageCreate | Events.MessageUpdate>): void {}
function takesSingleMw(_m: EventMiddleware<Events.MessageCreate>): void {}
function takesMultiHandler(_h: EventHandler<Events.MessageCreate | Events.MessageUpdate>): void {}
function takesSingleHandler(_h: EventHandler<Events.MessageCreate>): void {}

// both bases read their event-name parameter only in output positions, so the measured variance is
// covariant and the fast path accepts a widening. the `in out` annotation forces the structural check,
// which catches SingleEventPayload collapsing to never. dropping it makes these widenings compile

// @ts-expect-error a single-event middleware reads this.event as a concrete tuple, never as a union
takesMultiMw(singleMw);
// @ts-expect-error a single-event handler reads this.event as a concrete tuple, never as a union
takesMultiHandler(singleHandler);
// @ts-expect-error the union does not satisfy the single event name
takesSingleMw(multiMw);
// @ts-expect-error the union does not satisfy the single event name
takesSingleHandler(multiHandler);

takesSingleMw(singleMw);
takesSingleHandler(singleHandler);
