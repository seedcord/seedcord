import type { REST } from '@discordjs/rest';

declare module '@seedcord/core' {
    interface PluginCapabilityTypes {
        rest: REST;
    }
}
