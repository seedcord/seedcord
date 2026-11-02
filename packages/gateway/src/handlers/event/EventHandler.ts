import { caseFor } from '@seedcord/core/internal';

import { BaseHandler } from '#src/handlers/BaseHandler';

import type { Core } from '#interfaces/Core';
import type { ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { SingleEventPayload } from './payload';
import type { DispatchContext } from '@seedcord/core';
import type { ClientEvents } from 'discord.js';
import type { Promisable } from 'type-fest';

// a single tuple param would drop the discord.js labels from editor signature help
type EventMatchCases<Names extends ValidNonInteractionKeys, Ret> = {
    [Name in Names]: (...args: ClientEvents[Name]) => Promisable<Ret>;
};

/**
 * Base class for a Discord client event handler.
 *
 * Pass the event name(s) as the generic, the same one(s) as `@RegisterEvent`. On a single-event handler, read
 * `this.event` (the payload tuple) directly. On a handler registered for several events, branch with `this.match`,
 * keyed by event name, since the union of payload tuples is not directly readable.
 *
 * @typeParam Names - One or more `ClientEvents` keys, e.g. `Events.MessageCreate` or `Events.MessageCreate | Events.MessageUpdate`.
 *
 * @example
 * ```ts
 * \@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])
 * class PingPong extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
 *     async execute() {
 *         await this.match({
 *             [Events.MessageCreate]: (message) => message.reply('pong'),
 *             [Events.MessageUpdate]: (_oldMessage, edited) => edited.reply('pong')
 *         });
 *     }
 * }
 * ```
 */
export abstract class EventHandler<in out Names extends ValidNonInteractionKeys> extends BaseHandler<
    ClientEvents[Names]
> {
    constructor(event: ClientEvents[Names], core: Core, dispatch: DispatchContext) {
        super(event, core, dispatch, 'events');
    }

    // never on a multi-event handler, where reading it is a compile error
    declare protected readonly event: SingleEventPayload<Names>;

    /** The event that started this dispatch, one of the names in the generic. */
    protected get route(): Names {
        return this.dispatch.route as Names;
    }

    /**
     * Run the case for the current event. Use this only when the handler is registered for several
     * events. On a single-event handler, read `this.event` directly. On a multi-event handler `this.event` is
     * `never`, so match is the only way to read the payload.
     *
     * Provide one case per registered event, keyed by its name, and each case receives that event's own
     * payload tuple. The cases must cover every event in the generic. A missing event or an unknown key is a
     * compile error.
     *
     * @param cases - One handler per registered event, keyed by event name.
     * @returns The result of the case that ran.
     *
     * @example
     * ```ts
     * \@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])
     * class MessageWatcher extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
     *     async execute() {
     *         await this.match({
     *             [Events.MessageCreate]: (message) => this.scan(message),
     *             [Events.MessageUpdate]: (_old, updated) => this.scan(updated)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(cases: EventMatchCases<Names, Ret>): Promise<Ret> {
        const callback = caseFor(this, cases, 'event', this.route);
        // this.event is never on a multi-event handler. getEvent() returns the real tuple.
        return await callback(...this.getEvent());
    }
}
