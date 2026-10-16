import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

export type CliChannel = DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents>;

// one module instance per process, the HmrManager write and every framework read share it
let channel: CliChannel | undefined;

/** @internal */
export function setDevChannel(next: CliChannel | undefined): void {
    channel = next;
}

/** @internal */
export function getDevChannel(): CliChannel | undefined {
    return channel;
}
