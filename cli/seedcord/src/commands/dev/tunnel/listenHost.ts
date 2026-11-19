import { HostAugmentTarget } from '@seedcord/types/internal';

import type { ResolvedTunnel } from '#core/config/schema';
import type { SeedcordInstance } from '@seedcord/types/internal';

export const DEV_SERVER_HOST = '127.0.0.1';

// dev.tunnel doesn't apply to a gateway bot because it takes its interactions over the websocket
export function tunnelFor(instance: SeedcordInstance, tunnel: ResolvedTunnel): ResolvedTunnel {
    return instance[HostAugmentTarget] === '@seedcord/gateway' ? { mode: 'off' } : tunnel;
}

// cloudflared connects to 127.0.0.1
// on macOS, another process can listen there on the same port while the bot listens on every address
export function listenHostFor(tunnel: ResolvedTunnel): string | undefined {
    return tunnel.mode === 'quick' ? DEV_SERVER_HOST : undefined;
}

// core.url skips a quick tunnel because its hostname changes every run
export function stableUrlOf(tunnel: ResolvedTunnel): string | undefined {
    return tunnel.mode === 'url' ? tunnel.url : undefined;
}
