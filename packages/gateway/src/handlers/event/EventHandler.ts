import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';

import { BaseHandler } from '#src/handlers/BaseHandler';

import type { Core } from '#interfaces/Core';
import type { ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { SingleEventPayload } from './payload';
import type { DispatchContext } from '@seedcord/core';
import type { ClientEvents } from 'discord.js';
import type { Promisable } from 'type-fest';

// a single tuple param would drop the discord.js labels from editor signature help
type EventMatchArms<Names extends ValidNonInteractionKeys, Ret> = {
    [Name in Names]: (...args: ClientEvents[Name]) => Promisable<Ret>;
};

/**
 * Base class for a Discord client event handler.
 *
 * Pass the event name(s) as the generic, the same one(s) as `@RegisterEvent`. A single-event handler reads
 * `this.event` (the payload tuple) directly. A handler registered for several events branches with `this.match`,
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
    // the controller threads this in, undefined when a test constructs the handler directly
    private readonly firedEvent: Names | undefined;

    constructor(event: ClientEvents[Names], core: Core, dispatch: DispatchContext, eventName?: Names) {
        super(event, core, dispatch, 'events');
        this.firedEvent = eventName;
    }

    // never on a multi-event handler, where reading it is a compile error
    declare protected readonly event: SingleEventPayload<Names>;

    /**
     * Run the arm for whichever event fired. Use this only when the handler is registered for several
     * events. A single-event handler reads `this.event` directly. On a multi-event handler `this.event` is
     * `never`, so match is the only way to read the payload.
     *
     * Provide one arm per registered event, keyed by its name, and each arm receives that event's own
     * payload tuple. The arms must cover every event in the generic, a missing event or an unknown key is a
     * compile error.
     *
     * @param arms - One handler per registered event, keyed by event name.
     * @returns The result of the arm that ran.
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
    protected async match<Ret>(arms: EventMatchArms<Names, Ret>): Promise<Ret> {
        const name = this.firedEvent;
        if (name === undefined) {
            throw new SeedcordError(SeedcordErrorCode.EventNameUnavailable, [this.constructor.name, 'match()']);
        }
        // hasOwn, since a plain lookup for an event named `toString` returns Object.prototype's
        const arm = Object.hasOwn(arms, name) ? (arms as Record<string, unknown>)[name] : undefined;
        if (typeof arm !== 'function')
            throw new SeedcordTypeError(SeedcordErrorCode.MatchArmMissing, [this.constructor.name, 'event', name]);
        // this.event is never on a multi-event handler. getEvent() returns the real tuple.
        return await (arm as (...args: unknown[]) => Promisable<Ret>)(...this.getEvent());
    }
}
