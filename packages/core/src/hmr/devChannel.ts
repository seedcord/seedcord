import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// one module instance per process, the HmrManager write and every framework read share it
let channel: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents> | undefined;

/** @internal */
export function setDevChannel(next: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents> | undefined): void {
    channel = next;
}

/** @internal */
export function getDevChannel(): DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents> | undefined {
    return channel;
}
