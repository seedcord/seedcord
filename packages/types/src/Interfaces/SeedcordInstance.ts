import type { HostAugmentTarget, HostPluginKeys, HostShutdown, HostStartup, HostVersion } from '../brand';
import type { Config } from './Config';

// Core implements this. the CLI narrows a loaded module export to it after the SeedcordBrand runtime check
export interface SeedcordInstance {
    readonly config: Config;
    readonly username: string | undefined; // the bot's discord username, for the dev status. undefined before login

    // symbol keys keep these out of autocomplete on a host
    readonly [HostVersion]: string;
    readonly [HostAugmentTarget]: string;
    readonly [HostPluginKeys]: readonly string[];
    readonly [HostShutdown]: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly [HostStartup]: { abort(): void };
    start(): Promise<unknown>;
}
