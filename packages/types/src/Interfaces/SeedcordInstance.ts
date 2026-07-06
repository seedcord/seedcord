import type { Config } from './Config';

// Core implements this. the CLI narrows a loaded module export to it after the SeedcordBrand runtime check
export interface SeedcordInstance {
    readonly config: Config;
    readonly version: string;
    readonly shutdown: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly startup: { abort(): void };
    start(): Promise<unknown>;
}
