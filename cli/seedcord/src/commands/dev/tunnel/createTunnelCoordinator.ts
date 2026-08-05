import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { findCloudflared, installHint, systemLookup } from './cloudflared';
import { CloudflaredTunnel, systemTunnelDeps } from './CloudflaredTunnel';
import { InteractionsEndpoint } from './InteractionsEndpoint';
import { TunnelCoordinator } from './TunnelCoordinator';
import { waitForEngine } from './waitForEngine';

import type { ILogger } from '@seedcord/types';

export function missingCloudflaredHint(platform: NodeJS.Platform): string {
    return `cloudflared is missing, so an http bot has no public interactions endpoint. Install it with ${installHint(platform)}`;
}

export function createTunnelCoordinator(
    logger: ILogger,
    onUrl: (url: string | null) => void,
    findBinary: () => string | undefined = () => findCloudflared(systemLookup())
): TunnelCoordinator | undefined {
    if (!findBinary()) return undefined;

    const deps = systemTunnelDeps();
    return new TunnelCoordinator({
        makeTunnel: () => new CloudflaredTunnel(deps),
        endpoint: InteractionsEndpoint.create(() => validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'))),
        waitForRouting: (url) => waitForEngine(url, deps),
        onUrl,
        logger
    });
}
