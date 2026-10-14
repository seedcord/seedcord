import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// under seedcord dev, every interactions server binds this address and cloudflared forwards to it
export const DEV_SERVER_HOST = '127.0.0.1';

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
