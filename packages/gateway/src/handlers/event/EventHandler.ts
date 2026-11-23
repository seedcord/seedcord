import { runCase } from '@seedcord/core/internal';

import { BaseHandler } from '#src/handlers/BaseHandler';

import type { Core } from '#interfaces/Core';
import type { ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { SingleEventPayload } from './payload';
import type { DispatchContext } from '@seedcord/core';
import type { CaseReturn, MatchResult, OnlyCases } from '@seedcord/core/internal';
import type { ClientEvents } from 'discord.js';

// a single tuple param would hide the discord.js labels from editor signature help
type EventMatchCases<Names extends ValidNonInteractionKeys, Ret> = {
    [Name in Names]: (...args: ClientEvents[Name]) => CaseReturn<Ret>;
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
    declare protected readonly route: Names;

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
     * @typeParam Ret - The type that every case must return. Leave it out to get the union of what the cases return.
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
    protected async match<Ret = never, Cases extends EventMatchCases<Names, Ret> = EventMatchCases<Names, Ret>>(
        cases: OnlyCases<Cases, EventMatchCases<Names, Ret>>
    ): Promise<MatchResult<Ret, Cases>> {
        // this.event is never on a multi-event handler. getEvent() returns the real tuple.
        return await runCase<MatchResult<Ret, Cases>>(this, cases, 'event', this.route, ...this.getEvent());
    }
}
