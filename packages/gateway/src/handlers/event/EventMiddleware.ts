import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { BaseHandler } from '@handlers/BaseHandler';

import type { SingleEventPayload } from './payload';
import type { ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ClientEvents } from 'discord.js';

/**
 * Base class for Discord event middleware.
 *
 * Middleware runs before event handlers and can stop the event by throwing a `Silence`. Unlike `EventHandler`, it
 * runs the SAME for every event it is registered for, so it has no `match`. Specify a single event in the
 * generic and `{ events }` to read `this.event` fully typed. Span several events (or omit `{ events }` for a
 * catchall) and `this.event` narrows to `never`, read `this.eventName` and do work that does not depend on the
 * payload shape. A middleware that needs each event's payload is written one event per class.
 *
 * @typeParam EventName - One or more `ClientEvents` keys. Defaults to every event (catchall).
 */
export abstract class EventMiddleware<
    in out EventName extends ValidNonInteractionKeys = ValidNonInteractionKeys
> extends BaseHandler<ClientEvents[EventName]> {
    // the fired event name, threaded by the controller. undefined when constructed directly, e.g. in a test.
    private readonly firedEvent: EventName | undefined;

    constructor(event: ClientEvents[EventName], core: Core, eventName?: EventName) {
        super(event, core);
        this.firedEvent = eventName;
    }

    // a concrete tuple for one event, never for several or a catchall, so reading the payload on a multi-event
    // middleware is a compile error. branch on this.eventName and do payload-shape-independent work instead.
    declare protected readonly event: SingleEventPayload<EventName>;

    /**
     * The event that fired this middleware. Read it on a catchall or multi-event middleware, where `this.event`
     * is `never`, to do work that does not depend on the payload shape. A single-event middleware reads
     * `this.event` directly and does not need this.
     */
    protected get eventName(): EventName {
        if (this.firedEvent === undefined) throw new SeedcordError(SeedcordErrorCode.EventMiddlewareNameUnavailable);
        return this.firedEvent;
    }
}
