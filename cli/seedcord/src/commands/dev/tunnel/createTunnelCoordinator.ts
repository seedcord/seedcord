import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { paint } from '@seedcord/logger';
import { Envapter } from 'envapt';

import { findCloudflared, installHint, systemLookup } from './cloudflared';
import { CloudflaredTunnel, systemTunnelDeps } from './CloudflaredTunnel';
import { InteractionsEndpoint } from './InteractionsEndpoint';
import { awaitReachable, PROBE_SECONDS } from './probe';
import { TunnelCoordinator } from './TunnelCoordinator';

import type { ResolvedTunnel } from '#core/config/schema';
import type { TunnelStatus } from './TunnelCoordinator';
import type { ILogger } from '@seedcord/types';

export function missingCloudflaredHint(platform: NodeJS.Platform): string {
    const arrow = paint.mute('→');
    return [
        `${paint.sky.bold('cloudflared')} is missing, so a tunnel can't be set up for you. Discord won't have any url to reach this bot`,
        `${arrow} install it with ${paint.mint.bold(installHint(platform))}`,
        `${arrow} or set ${paint.amber('tunnel')} to an https url you already serve, like ${paint.sky.italic('https://bot.example.com')}`
    ].join('\n');
}

export function createTunnelCoordinator(
    logger: ILogger,
    onStatus: (status: TunnelStatus | null) => void,
    tunnel: ResolvedTunnel,
    findBinary: () => string | undefined = () => findCloudflared(systemLookup())
): TunnelCoordinator | undefined {
    if (tunnel.mode === 'off') return undefined;

    const deps = systemTunnelDeps();
    const endpoint = InteractionsEndpoint.create(() => validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN')));

    if (tunnel.mode === 'url') {
        return new TunnelCoordinator({
            makeTunnel: () => ({
                // no answer here means your server is down or the url is wrong
                open: async (signal, _port, onResolving) => {
                    onResolving?.();
                    if (await awaitReachable(tunnel.url, deps, signal)) return tunnel.url;
                    throw new SeedcordError(SeedcordErrorCode.CliTunnelUnreachable, [tunnel.url, PROBE_SECONDS]);
                },
                // the forwarder is the user's process
                stop: () => undefined
            }),
            kind: 'configured',
            endpoint,
            onStatus,
            logger
        });
    }

    const binary = findBinary();
    if (!binary) return undefined;

    return new TunnelCoordinator({
        makeTunnel: (onLost) => new CloudflaredTunnel(deps, binary, onLost),
        kind: 'quick',
        endpoint,
        onStatus,
        logger
    });
}
