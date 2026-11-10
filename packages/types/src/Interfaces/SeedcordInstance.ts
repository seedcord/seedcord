import type {
    HostAugmentTarget,
    HostContract,
    HostListenHost,
    HostPlugins,
    HostShutdown,
    HostStartup,
    HostVersion
} from '#src/brand';
import type { Config } from './Config';
import type { REST } from '@discordjs/rest';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

export type TransportPackage = '@seedcord/gateway' | '@seedcord/http';

// Core implements this. the CLI narrows a loaded module export to it after the SeedcordBrand runtime check
export interface SeedcordInstance {
    readonly config: Config;
    readonly rest: REST; // the CLI copies its options for every request it makes to discord
    readonly username: string | undefined; // the bot's discord username, for the dev status. undefined before login

    // symbol keys keep these out of autocomplete on a host
    readonly [HostVersion]: string;
    readonly [HostContract]: number;
    readonly [HostAugmentTarget]: TransportPackage;
    readonly [HostPlugins]: {
        // the attach keys in attach order. codegen writes one Core row for each
        readonly keys: readonly string[];
        // every dispatch member, with the key of the plugin that adds it
        readonly members: readonly { readonly key: string; readonly member: string }[];
        prepareCommands(commands: readonly RESTPostAPIApplicationCommandsJSONBody[]): Promise<void>;
    };
    readonly [HostShutdown]: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly [HostStartup]: { abort(): void };
    // seedcord dev sets this before start() for a quick tunnel
    // an interactions server binds every address when unset
    [HostListenHost]?: string | undefined;
    start(): Promise<unknown>;
}
