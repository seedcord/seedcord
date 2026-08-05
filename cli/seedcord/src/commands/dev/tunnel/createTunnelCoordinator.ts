import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { findCloudflared, installHint, systemLookup } from './cloudflared';
import { CloudflaredTunnel, systemTunnelDeps } from './CloudflaredTunnel';
import { ConfiguredUrl } from './ConfiguredUrl';
import { InteractionsEndpoint } from './InteractionsEndpoint';
import { TunnelCoordinator } from './TunnelCoordinator';

import type { ResolvedTunnel } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';

export function missingCloudflaredHint(platform: NodeJS.Platform): string {
    return `cloudflared is missing, so an http bot has no public interactions endpoint. Install it with ${installHint(platform)}`;
}

export function createTunnelCoordinator(
    logger: ILogger,
    onUrl: (url: string | null) => void,
    tunnel: ResolvedTunnel,
    findBinary: () => string | undefined = () => findCloudflared(systemLookup())
): TunnelCoordinator | undefined {
    if (tunnel.mode === 'off') return undefined;

    const deps = systemTunnelDeps();
    const endpoint = InteractionsEndpoint.create(() => validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN')));

    if (tunnel.mode === 'url') {
        return new TunnelCoordinator({
            makeTunnel: () => new ConfiguredUrl(tunnel.url, deps),
            kind: 'configured',
            endpoint,
            onUrl,
            logger
        });
    }

    const binary = findBinary();
    if (!binary) return undefined;

    return new TunnelCoordinator({
        makeTunnel: () => new CloudflaredTunnel(deps, binary),
        kind: 'quick',
        endpoint,
        onUrl,
        logger
    });
}
