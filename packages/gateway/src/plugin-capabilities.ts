import type { REST } from '@discordjs/rest';
import type { Client } from 'discord.js';

declare module '@seedcord/core' {
    interface PluginCapabilityTypes {
        client: Client;
        rest: REST;
    }
}
