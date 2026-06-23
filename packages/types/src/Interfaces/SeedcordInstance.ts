import type { Config } from './Config';

/**
 * Minimal structural contract for a runnable Seedcord instance: read config, start, and shut down.
 * The framework's `Core` extends this. External hosts (the CLI) narrow an unknown module export to
 * this shape after a runtime brand check.
 */
export interface SeedcordInstance {
    readonly config: Config;
    readonly shutdown: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly startup: { abort(): void };
    start(): Promise<unknown>;
}
