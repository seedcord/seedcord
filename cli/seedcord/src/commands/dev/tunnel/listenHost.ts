import type { ResolvedTunnel } from '#core/config/schema';

export const DEV_SERVER_HOST = '127.0.0.1';

// cloudflared connects to 127.0.0.1
// on macOS, another process can listen there on the same port while the bot listens on every address
export function listenHostFor(tunnel: ResolvedTunnel): string | undefined {
    return tunnel.mode === 'quick' ? DEV_SERVER_HOST : undefined;
}
