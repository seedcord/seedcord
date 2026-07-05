import type { Config } from './Config';

export interface SeedcordInstance {
    readonly config: Config;
    readonly version: string;
    readonly shutdown: { run(exitCode?: number, exitProcess?: boolean): Promise<void> };
    readonly startup: { abort(): void };
    start(): Promise<unknown>;
}
