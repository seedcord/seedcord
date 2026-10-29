import type {
    HostAugmentTarget,
    HostListenHost,
    HostPluginKeys,
    HostShutdown,
    HostStartup,
    HostVersion
} from '#src/brand';
import type { Config } from './Config';
import type { REST } from '@discordjs/rest';

export type TransportPackage = '@seedcord/gateway' | '@seedcord/http';

// Core implements this. the CLI narrows a loaded module export to it after the SeedcordBrand runtime check
export interface SeedcordInstance {
    readonly config: Config;
    readonly rest: REST; // the CLI copies its options for every request it makes to discord
    readonly username: string | undefined; // the bot's discord username, for the dev status. undefined before login

    // symbol keys keep these out of autocomplete on a host
    readonly [HostVersion]: string;
    readonly [HostAugmentTarget]: TransportPackage;
    readonly [HostPluginKeys]: readonly string[];
    readonly [HostShutdown]: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly [HostStartup]: { abort(): void };
    // seedcord dev sets this before start() for a quick tunnel
    // an interactions server binds every address when unset
    [HostListenHost]?: string | undefined;
    start(): Promise<unknown>;
}
