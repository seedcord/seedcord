import type { Config } from './Config';

// Core implements this. the CLI narrows a loaded module export to it after the SeedcordBrand runtime check
export interface SeedcordInstance {
    readonly config: Config;
    readonly version: string; // for `seedcord dev` to show the current version
    readonly username: string | undefined; // the bot's discord username, for the dev status. undefined before login
    readonly augmentTarget: string; // the transport package codegen uses for declare module
    readonly shutdown: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly startup: { abort(): void };
    start(): Promise<unknown>;
}
