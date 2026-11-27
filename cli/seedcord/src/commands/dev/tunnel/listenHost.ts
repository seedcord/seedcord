import type { ResolvedTunnel } from '#core/config/schema';

export const DEV_SERVER_HOST = '127.0.0.1';

// cloudflared connects to 127.0.0.1
// on macOS, another process can listen there on the same port while the bot listens on every address
export function listenHostFor(tunnel: ResolvedTunnel): string | undefined {
    return tunnel.mode === 'quick' ? DEV_SERVER_HOST : undefined;
}

// cloudflare gives each quick tunnel a new subdomain of this one
const QUICK_TUNNEL_DOMAIN = '.trycloudflare.com';

// vite already allows localhost and ip addresses
export function tunnelHostsOf(tunnel: ResolvedTunnel): string[] {
    if (tunnel.mode === 'url') return [new URL(tunnel.url).hostname];
    return tunnel.mode === 'quick' ? [QUICK_TUNNEL_DOMAIN] : [];
}

// core.url skips a quick tunnel because its hostname changes every run
export function stableUrlOf(tunnel: ResolvedTunnel): string | undefined {
    return tunnel.mode === 'url' ? tunnel.url : undefined;
}
