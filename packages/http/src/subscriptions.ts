import type { APIInteraction } from 'discord-api-types/v10';

declare module '@seedcord/core/internal' {
    interface DefaultSubscriptions {
        /** Triggered for every verified interaction, before routing. */
        anyInteraction: {
            interaction: APIInteraction;
        };
    }
}
