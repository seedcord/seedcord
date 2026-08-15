import { describe, expect, it, vi } from 'vitest';

import { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';

import { silentLogger } from '../silentLogger';

import type { TunnelCoordinator } from '#commands/dev/tunnel/TunnelCoordinator';
import type { ResolvedTunnel } from '#core/config/schema';
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
    it('reports a coordinator that fails to build and resolves', async () => {
        const error = vi.fn();
        const boom = new Error('cloudflared lookup exploded');
        const routing = new TunnelRouter(
            () => {
                throw boom;
            },
            { ...silentLogger, error }
        );

        await expect(routing.route(QUICK, { type: 'server-listening', port: 1 })).resolves.toBeUndefined();

        expect(error).toHaveBeenCalledOnce();
        expect(error.mock.calls[0]?.[1]).toBe(boom);
    });

    it('hands the bound port to the coordinator', async () => {
        const onPort = vi.fn().mockResolvedValue(undefined);

        await router(fakeCoordinator({ onPort })).route(QUICK, {
            type: 'server-listening',
            port: 4321
        });

        expect(onPort).toHaveBeenCalledExactlyOnceWith(4321);
    });

    it('stays out of the way when the config turns the tunnel off', async () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const warn = vi.fn();

        await router(fakeCoordinator({ onPort }), { ...silentLogger, warn }).route(OFF, {
            type: 'server-listening',
            port: 4321
        });

        expect(onPort).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    it('ignores every event that is not a bound port', async () => {
        const onPort = vi.fn().mockResolvedValue(undefined);

        await router(fakeCoordinator({ onPort })).route(QUICK, { type: 'ready' });

        expect(onPort).not.toHaveBeenCalled();
    });

    it('names the install command once when cloudflared is absent', async () => {
        const warn = vi.fn();
        const routing = router(undefined, { ...silentLogger, warn });

        await routing.route(QUICK, { type: 'server-listening', port: 1 });
        await routing.route(QUICK, { type: 'server-listening', port: 2 });

        expect(warn).toHaveBeenCalledOnce();
    });

    it('stop resolves with no coordinator', async () => {
        await expect(router(undefined).stop()).resolves.toBeUndefined();
    });

    it('stop reaches the coordinator', async () => {
        const stop = vi.fn().mockResolvedValue(undefined);
        const routing = router(fakeCoordinator({ stop }));
        await routing.route(QUICK, { type: 'server-listening', port: 1 });

        await routing.stop();

        expect(stop).toHaveBeenCalledOnce();
    });

    it('builds the coordinator once across restarts', async () => {
        const make = vi.fn(() => fakeCoordinator());
        const routing = new TunnelRouter(make, silentLogger);

        await routing.route(QUICK, { type: 'server-listening', port: 1 });
        await routing.route(QUICK, { type: 'server-listening', port: 2 });

        expect(make).toHaveBeenCalledOnce();
    });

    it('rebuilds on a restart that changed the url', async () => {
        const stopStale = vi.fn().mockResolvedValue(undefined);
        const onFreshPort = vi.fn().mockResolvedValue(undefined);
        const make = vi
            .fn()
            .mockReturnValueOnce(fakeCoordinator({ stop: stopStale }))
            .mockReturnValueOnce(fakeCoordinator({ onPort: onFreshPort }));
        const routing = new TunnelRouter(make, silentLogger);

        await routing.route({ mode: 'url', url: 'https://stale.example.com' }, { type: 'server-listening', port: 1 });
        await routing.route({ mode: 'url', url: 'https://fresh.example.com' }, { type: 'server-listening', port: 2 });

        expect(make).toHaveBeenCalledTimes(2);
        expect(make.mock.calls[1]?.[0]).toEqual({ mode: 'url', url: 'https://fresh.example.com' });
        expect(stopStale).toHaveBeenCalledOnce();
        expect(onFreshPort).toHaveBeenCalledExactlyOnceWith(2);
    });

    it('drops the running tunnel when a restart turns it off', async () => {
        const stop = vi.fn().mockResolvedValue(undefined);
        const routing = new TunnelRouter(() => fakeCoordinator({ stop }), silentLogger);

        await routing.route({ mode: 'url', url: 'https://stale.example.com' }, { type: 'server-listening', port: 1 });
        await routing.route(OFF, { type: 'server-listening', port: 2 });

        expect(stop).toHaveBeenCalledOnce();
    });

    it('routes a configured url without asking for cloudflared', async () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const warn = vi.fn();
        const configured: ResolvedTunnel = { mode: 'url', url: 'https://bot.example.com' };

        await router(fakeCoordinator({ onPort }), { ...silentLogger, warn }).route(configured, {
            type: 'server-listening',
            port: 4321
        });

        expect(onPort).toHaveBeenCalledExactlyOnceWith(4321);
        expect(warn).not.toHaveBeenCalled();
    });
});
