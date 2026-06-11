import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';

import { BaseHandler } from '@handlers/BaseHandler';

import type { SingleEventPayload } from './payload';
import type { Handler, ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ClientEvents } from 'discord.js';
import type { Promisable } from 'type-fest';

// one arm per registered event, keyed by event name, receiving that event's payload as named params. spread,
// not a single tuple, so the discord.js tuple labels surface as parameter names in editor signature help, e.g.
// messageUpdate gives (oldMessage, newMessage).
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
export abstract class EventHandler<Names extends ValidNonInteractionKeys>
    extends BaseHandler<ClientEvents[Names]>
    implements Handler
{
    // the fired event name, threaded by the controller. undefined when constructed directly, e.g. in a test.
    private readonly firedEvent: Names | undefined;

    constructor(event: ClientEvents[Names], core: Core, eventName?: Names) {
        super(event, core);
        this.firedEvent = eventName;
    }

    // a concrete tuple for one event, never for several, so reading it on a multi-event handler is a compile error
    declare protected readonly event: SingleEventPayload<Names>;

    /**
     * Run the arm for whichever event fired, when this handler is registered for several events.
     *
     * Provide one arm per registered event, keyed by its name, and each arm receives that event's payload
     * tuple. A missing arm is a compile error. A single-event handler reads `this.event` directly instead.
     *
     * @param arms - One handler per registered event, keyed by event name.
     * @returns The result of the arm that ran.
     */
    protected async match<Ret>(arms: EventMatchArms<Names, Ret>): Promise<Ret> {
        const name = this.firedEvent;
        if (name === undefined) throw new SeedcordError(SeedcordErrorCode.EventMatchArmMissing, ['<no event>']);
        // justified: each arm takes its own payload tuple, so no single param type unifies the arms in a cast. read
        // the arm as unknown keyed by the runtime event name, then narrow to a function before calling it.
        const arm = (arms as Record<string, unknown>)[name];
        if (typeof arm !== 'function') throw new SeedcordError(SeedcordErrorCode.EventMatchArmMissing, [name]);
        // getEvent() carries the real payload tuple, this.event is narrowed to never for the multi-event view.
        // spread it so the arm receives the same named params its type declares.
        return await (arm as (...args: unknown[]) => Promisable<Ret>)(...this.getEvent());
    }
}
