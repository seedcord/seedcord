import type { ClientEvents, Interaction } from 'discord.js';

declare module '@seedcord/core/internal' {
    interface DefaultSubscriptions {
        /** Triggered when an event dispatch throws past the fault boundary. */
        unhandledEventError: {
            error: Error;
        };
        /** Triggered before an event's handlers run. An event that no handler registered never triggers it. */
        eventDispatching: {
            [Name in keyof ClientEvents]: { name: Name; args: ClientEvents[Name] };
        }[keyof ClientEvents];
        /** Triggered for every interaction the bot receives, before routing. */
        anyInteraction: {
            interaction: Interaction;
        };
    }
}
