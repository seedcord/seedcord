import type { DispatchOutcome, HandlerOutcome } from '@seedcord/core';
import type { ClientEvents, Interaction } from 'discord.js';

declare module '@seedcord/core/internal' {
    interface DefaultSubscriptions {
        /** Triggered when an event dispatch throws past the fault boundary. */
        unhandledEventError: {
            error: Error;
        };
        /** Triggered before an event's handlers run. An event without a registered handler never triggers it. */
        eventDispatching: {
            [Name in keyof ClientEvents]: { dispatchId: string; name: Name; args: ClientEvents[Name] };
        }[keyof ClientEvents];
        /**
         * Published once an event's handlers settle, pairing with `eventDispatching`. When the event
         * doesn't have a registered handler, neither key is published.
         */
        eventDispatched: {
            /** The same id `eventDispatching` published for this dispatch. */
            dispatchId: string;
            name: keyof ClientEvents;
            /** How the middleware chain ended. If the chain refused the event, `handlers` is empty. */
            outcome: DispatchOutcome;
            /** One entry per handler that ran, in the order they ran. */
            handlers: readonly HandlerOutcome[];
            /** Dispatch entry until every handler settles. A clock change never affects it. */
            durationMs: number;
        };
        /** Triggered for every interaction the bot receives before routing. */
        anyInteraction: {
            interaction: Interaction;
        };
    }
}
