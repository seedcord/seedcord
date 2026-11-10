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
 * doesn't take a `match` because it runs the SAME for every event it is registered for. Specify a single event in the
 * generic and `{ events }` to read `this.event` fully typed. If you span several events (or omit `{ events }` for
 * a catchall), `this.event` narrows to `never`. Read `this.route` there, for work that doesn't depend on the
 * payload shape. Write one class per event for a middleware that needs each event's payload.
 *
 * @typeParam EventName - One or more `ClientEvents` keys. Defaults to every event (catchall).
 */
export abstract class EventMiddleware<
    in out EventName extends ValidNonInteractionKeys = ValidNonInteractionKeys
> extends BaseHandler<ClientEvents[EventName]> {
    constructor(event: ClientEvents[EventName], core: Core, dispatch: DispatchContext) {
        super(event, core, dispatch, 'events');
    }

    // reading this on a multi-event middleware is a compile error because it's a concrete tuple for one event only
    declare protected readonly event: SingleEventPayload<EventName>;

    /**
     * The event that started this dispatch, one of the names in the generic. Read it on a catchall or multi-event
     * middleware, where `this.event` is `never`, to do work that doesn't depend on the payload shape.
     */
    declare protected readonly route: EventName;

    /**
     * Runs once the event finishes, newest middleware first. Every middleware whose `execute()`
     * started gets the call, a stopped chain and a throw included. Implement it to release something
     * this middleware took in `execute()`. Seedcord logs a throw in here and doesn't rethrow it.
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
