import { PRODUCTION_SITES } from '@seedcord/brand';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { findCloudflared, installHint, systemLookup } from './cloudflared';
import { CloudflaredTunnel, systemTunnelDeps } from './CloudflaredTunnel';
import { InteractionsEndpoint } from './InteractionsEndpoint';
import { awaitReachable, PROBE_SECONDS } from './probe';
import { TunnelCoordinator } from './TunnelCoordinator';

import type { ResolvedTunnel } from '#core/config/schema';
import type { TunnelDeps } from './CloudflaredTunnel';
import type { TunnelKind, TunnelStatus } from './TunnelCoordinator';
import type { ILogger } from '@seedcord/types';

const PASTE_HINT = 'The tunnel is still up, so try pasting that URL into the dashboard.';
const RESTART_HINT = 'Restart for a fresh hostname, or set `tunnel` to an https URL you already serve.';
const NO_PORT_HINT = `seedcord didn't start a tunnel, since the bot runs with ${paint.bold('port: false')} and cloudflared doesn't have a port to forward to. Give the bot a port while you develop, or set ${paint.amber('tunnel')} to the URL of the server that serves your bot: ${paint.sky(PRODUCTION_SITES.guide.at('build/embed'))}`;

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
    const kind = tunnel.mode === 'url' ? configuredKind(tunnel.url, deps) : quickKind(deps, findBinary());
    return kind && new TunnelCoordinator({ kind, endpoint: InteractionsEndpoint.create(), onStatus, logger });
}

function configuredKind(url: string, deps: TunnelDeps): TunnelKind {
    return {
        prepare: () => ({
            opening: `Checking that ${paint.sky.bold(url)} answers`,
            makeTunnel: () => ({
                // no answer here means your server is down or the url is wrong
                open: async (signal, onResolving) => {
                    onResolving?.();
                    if (await awaitReachable(url, deps, signal)) return url;
                    throw new SeedcordError(SeedcordErrorCode.CliTunnelUnreachable, [url, PROBE_SECONDS]);
                },
                stop: () => undefined
            })
        }),
        failureHint: () => undefined,
        clearsEndpointOnStop: false
    };
}

function quickKind(deps: TunnelDeps, binary: string | undefined): TunnelKind | undefined {
    if (!binary) return undefined;
    return {
        prepare: (port) => {
            if (port === false) return { warning: NO_PORT_HINT };
            return {
                opening: `Requesting a cloudflared tunnel to port ${paint.sky.bold(String(port))}`,
                makeTunnel: (onLost) => {
                    const cloudflared = new CloudflaredTunnel(deps, binary, onLost);
                    return {
                        open: (signal, onResolving) => cloudflared.open(signal, port, onResolving),
                        stop: () => cloudflared.stop()
                    };
                }
            };
        },
        failureHint: (tunnelStopped) => (tunnelStopped ? RESTART_HINT : PASTE_HINT),
        // a quick hostname lasts only as long as this process
        clearsEndpointOnStop: true
    };
}
