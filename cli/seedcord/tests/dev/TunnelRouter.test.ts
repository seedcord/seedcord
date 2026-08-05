import { describe, expect, it, vi } from 'vitest';

import { TunnelRouter } from '@commands/dev/tunnel/TunnelRouter';

import { silentLogger } from '../silentLogger';

import type { TunnelCoordinator } from '@commands/dev/tunnel/TunnelCoordinator';
import type { ILogger } from '@seedcord/types';

// justified: the router reads only onPort and stop off the coordinator
function fakeCoordinator(overrides: Partial<TunnelCoordinator> = {}): TunnelCoordinator {
    return { onPort: () => Promise.resolve(), stop: () => Promise.resolve(), ...overrides } as TunnelCoordinator;
}

function router(coordinator: TunnelCoordinator | undefined, logger: ILogger = silentLogger): TunnelRouter {
    return new TunnelRouter(coordinator, logger);
}

describe('TunnelRouter', () => {
    it('hands the bound port to the coordinator', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);

        router(fakeCoordinator({ onPort })).route(true, { type: 'server-listening', port: 4321 });

        expect(onPort).toHaveBeenCalledExactlyOnceWith(4321);
    });

    it('stays out of the way when the config turns the tunnel off', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const warn = vi.fn();

        router(fakeCoordinator({ onPort }), { ...silentLogger, warn }).route(false, {
            type: 'server-listening',
            port: 4321
        });

        expect(onPort).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    it('ignores every event that is not a bound port', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);

        router(fakeCoordinator({ onPort })).route(true, { type: 'ready' });

        expect(onPort).not.toHaveBeenCalled();
    });

    it('names the install command once when cloudflared is absent', () => {
        const warn = vi.fn();
        const routing = router(undefined, { ...silentLogger, warn });

        routing.route(true, { type: 'server-listening', port: 1 });
        routing.route(true, { type: 'server-listening', port: 2 });

        expect(warn).toHaveBeenCalledOnce();
    });

    it('stop resolves with no coordinator', async () => {
        await expect(router(undefined).stop()).resolves.toBeUndefined();
    });

    it('stop reaches the coordinator', async () => {
        const stop = vi.fn().mockResolvedValue(undefined);

        await router(fakeCoordinator({ stop })).stop();

        expect(stop).toHaveBeenCalledOnce();
    });
});
