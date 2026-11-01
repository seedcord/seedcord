import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { BaseHandler } from '#src/handlers/BaseHandler';

import type { Core } from '#interfaces/Core';
import type { ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { SingleEventPayload } from './payload';
import type { DispatchContext, EventDispatchResult } from '@seedcord/core';
import type { ClientEvents } from 'discord.js';
import type { Promisable } from 'type-fest';

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
    // the controller threads this in, undefined when a test constructs the middleware directly
    private readonly firedEvent: EventName | undefined;

    constructor(event: ClientEvents[EventName], core: Core, dispatch: DispatchContext, eventName?: EventName) {
        super(event, core, dispatch, 'events');
        this.firedEvent = eventName;
    }

    // a concrete tuple for one event only, so reading it on a multi-event middleware is a compile error
    declare protected readonly event: SingleEventPayload<EventName>;

    /**
     * The name of the event being processed. Read it on a catchall or multi-event middleware, where `this.event`
     * is `never`, to do work that does not depend on the payload shape. A single-event middleware reads
     * `this.event` directly and does not need this.
     */
    protected get eventName(): EventName {
        if (this.firedEvent === undefined) {
            throw new SeedcordError(SeedcordErrorCode.EventNameUnavailable, [this.constructor.name, 'this.eventName']);
        }
        return this.firedEvent;
    }

    /**
     * Runs once the event finishes, newest middleware first. Every middleware whose `execute()`
     * started gets the call, a stopped chain and a throw included. Implement it to release something
     * this middleware took in `execute()`. A throw in here is logged and goes no further.
     *
     * @param result - `outcome` reports the chain alone. `handlers` holds one entry per handler that
     * ran, empty exactly when the chain stopped the event.
     *
     * @example
     * ```ts
     * // the base declares it. an implementation carries `override`.
     * override async after(result: EventDispatchResult) {
     *     this.span.end();
     * }
     * ```
     */
    public after?(result: EventDispatchResult): Promisable<void>;
}
