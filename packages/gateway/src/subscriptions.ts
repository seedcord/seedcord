import type { ClientEvents, Interaction } from 'discord.js';

declare module '@seedcord/core/internal' {
    interface DefaultSubscriptions {
        /** Triggered when an event dispatch throws past the fault boundary. */
        unhandledEventError: {
            error: Error;
        };
        /** Triggered for every client event the bot receives, before its handlers run. */
        anyEvent: {
            [Name in keyof ClientEvents]: { name: Name; args: ClientEvents[Name] };
        }[keyof ClientEvents];
        /** Triggered for every interaction the bot receives, before routing. */
        anyInteraction: {
            interaction: Interaction;
        };
    }
}
