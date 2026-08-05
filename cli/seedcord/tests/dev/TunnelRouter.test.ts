import { describe, expect, it, vi } from 'vitest';

import { TunnelRouter } from '@commands/dev/tunnel/TunnelRouter';

import { silentLogger } from '../silentLogger';

import type { TunnelCoordinator } from '@commands/dev/tunnel/TunnelCoordinator';
import type { ResolvedTunnel } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';

const QUICK: ResolvedTunnel = { mode: 'quick' };
const OFF: ResolvedTunnel = { mode: 'off' };

// justified: the router reads only onPort and stop off the coordinator
function fakeCoordinator(overrides: Partial<TunnelCoordinator> = {}): TunnelCoordinator {
    return { onPort: () => Promise.resolve(), stop: () => Promise.resolve(), ...overrides } as TunnelCoordinator;
}

function router(coordinator: TunnelCoordinator | undefined, logger: ILogger = silentLogger): TunnelRouter {
    return new TunnelRouter(() => coordinator, logger);
}

describe('TunnelRouter', () => {
    it('hands the bound port to the coordinator', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);

        router(fakeCoordinator({ onPort })).route(QUICK, {
            type: 'server-listening',
            port: 4321,
            healthPath: '/health'
        });

        expect(onPort).toHaveBeenCalledExactlyOnceWith(4321, '/health');
    });

    it('stays out of the way when the config turns the tunnel off', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const warn = vi.fn();

        router(fakeCoordinator({ onPort }), { ...silentLogger, warn }).route(OFF, {
            type: 'server-listening',
            port: 4321,
            healthPath: '/health'
        });

        expect(onPort).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    it('ignores every event that is not a bound port', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);

        router(fakeCoordinator({ onPort })).route(QUICK, { type: 'ready' });

        expect(onPort).not.toHaveBeenCalled();
    });

    it('names the install command once when cloudflared is absent', () => {
        const warn = vi.fn();
        const routing = router(undefined, { ...silentLogger, warn });

        routing.route(QUICK, { type: 'server-listening', port: 1, healthPath: '/health' });
        routing.route(QUICK, { type: 'server-listening', port: 2, healthPath: '/health' });

        expect(warn).toHaveBeenCalledOnce();
    });

    it('stop resolves with no coordinator', async () => {
        await expect(router(undefined).stop()).resolves.toBeUndefined();
    });

    it('stop reaches the coordinator', async () => {
        const stop = vi.fn().mockResolvedValue(undefined);
        const routing = router(fakeCoordinator({ stop }));
        routing.route(QUICK, { type: 'server-listening', port: 1, healthPath: '/health' });

        await routing.stop();

        expect(stop).toHaveBeenCalledOnce();
    });

    it('builds the coordinator once across restarts', () => {
        const make = vi.fn(() => fakeCoordinator());
        const routing = new TunnelRouter(make, silentLogger);

        routing.route(QUICK, { type: 'server-listening', port: 1, healthPath: '/health' });
        routing.route(QUICK, { type: 'server-listening', port: 2, healthPath: '/health' });

        expect(make).toHaveBeenCalledOnce();
    });

    it('routes a configured url without asking for cloudflared', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const warn = vi.fn();
        const configured: ResolvedTunnel = { mode: 'url', url: 'https://bot.example.com' };

        router(fakeCoordinator({ onPort }), { ...silentLogger, warn }).route(configured, {
            type: 'server-listening',
            port: 4321,
            healthPath: '/health'
        });

        expect(onPort).toHaveBeenCalledExactlyOnceWith(4321, '/health');
        expect(warn).not.toHaveBeenCalled();
    });
});
