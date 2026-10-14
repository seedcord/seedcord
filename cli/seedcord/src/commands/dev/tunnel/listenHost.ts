import { DEV_SERVER_HOST } from '@seedcord/core/internal';

import type { ResolvedTunnel } from '#core/config/schema';

// cloudflared runs on this machine. a tunnel from the url setting can reach the bot from anywhere
export function listenHostFor(tunnel: ResolvedTunnel): string | undefined {
    return tunnel.mode === 'quick' ? DEV_SERVER_HOST : undefined;
}
