import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// the dev wire, held in a module-private singleton. NEVER export this from hmr/index.ts. the seedcord
// package exposes only ".", so an unbarreled singleton stays unreachable by user and plugin code at runtime.
let channel: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents> | undefined;

export function setDevChannel(next: DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents>): void {
    channel = next;
}

export function getDevChannel(): DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents> | undefined {
    return channel;
}
