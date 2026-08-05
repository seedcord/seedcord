import { describe, expect, it, vi } from 'vitest';

import { TunnelCoordinator } from '@commands/dev/tunnel/TunnelCoordinator';

import { silentLogger } from '../silentLogger';

import type { CoordinatorDeps } from '@commands/dev/tunnel/TunnelCoordinator';

function deps(overrides: Partial<CoordinatorDeps> = {}): CoordinatorDeps {
    return {
        tunnel: {
            open: (port) => Promise.resolve(`https://p${String(port)}.trycloudflare.com`),
            stop: () => undefined
        },
        endpoint: { set: () => Promise.resolve(), clear: () => Promise.resolve() },
        waitForRouting: () => Promise.resolve(),
        logger: silentLogger,
        ...overrides
    };
}

describe('TunnelCoordinator', () => {
    it('opens, waits for routing, then writes the endpoint', async () => {
        const order: string[] = [];
        const coordinator = new TunnelCoordinator(
            deps({
                tunnel: {
                    open: (port) => {
                        order.push('open');
                        return Promise.resolve(`https://p${String(port)}.trycloudflare.com`);
                    },
                    stop: () => undefined
                },
                waitForRouting: () => {
                    order.push('wait');
                    return Promise.resolve();
                },
                endpoint: {
                    set: () => {
                        order.push('set');
                        return Promise.resolve();
                    },
                    clear: () => Promise.resolve()
                }
            })
        );

        await coordinator.onPort(3000);

        expect(order).toEqual(['open', 'wait', 'set']);
    });

    it('writes the endpoint the tunnel reported', async () => {
        const set = vi.fn<CoordinatorDeps['endpoint']['set']>().mockResolvedValue();
        const coordinator = new TunnelCoordinator(deps({ endpoint: { set, clear: () => Promise.resolve() } }));

        await coordinator.onPort(4321);

        expect(set).toHaveBeenCalledExactlyOnceWith('https://p4321.trycloudflare.com');
    });

    it('leaves the tunnel alone when the port is unchanged', async () => {
        const open = vi.fn<CoordinatorDeps['tunnel']['open']>().mockResolvedValue('https://p3000.trycloudflare.com');
        const coordinator = new TunnelCoordinator(deps({ tunnel: { open, stop: () => undefined } }));

        await coordinator.onPort(3000);
        await coordinator.onPort(3000);

        expect(open).toHaveBeenCalledOnce();
    });

    it('replaces the tunnel when a restart binds a different port', async () => {
        const open = vi.fn<CoordinatorDeps['tunnel']['open']>().mockResolvedValue('https://p1.trycloudflare.com');
        const stop = vi.fn();
        const coordinator = new TunnelCoordinator(deps({ tunnel: { open, stop } }));

        await coordinator.onPort(3000);
        await coordinator.onPort(3001);

        expect(stop).toHaveBeenCalledOnce();
        expect(open).toHaveBeenCalledTimes(2);
    });

    it('warns and keeps the session running when the endpoint write fails', async () => {
        const warn = vi.fn();
        const coordinator = new TunnelCoordinator(
            deps({
                endpoint: { set: () => Promise.reject(new Error('403')), clear: () => Promise.resolve() },
                logger: { ...silentLogger, warn }
            })
        );

        await expect(coordinator.onPort(3000)).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledOnce();
    });

    it('retries the same port after a failure', async () => {
        const open = vi.fn<CoordinatorDeps['tunnel']['open']>().mockResolvedValue('https://p3000.trycloudflare.com');
        const set = vi
            .fn<CoordinatorDeps['endpoint']['set']>()
            .mockRejectedValueOnce(new Error('403'))
            .mockResolvedValueOnce();
        const coordinator = new TunnelCoordinator(
            deps({ tunnel: { open, stop: () => undefined }, endpoint: { set, clear: () => Promise.resolve() } })
        );

        await coordinator.onPort(3000);
        await coordinator.onPort(3000);

        expect(open).toHaveBeenCalledTimes(2);
    });

    it('stop kills the tunnel and clears the endpoint', async () => {
        const stop = vi.fn();
        const clear = vi.fn<CoordinatorDeps['endpoint']['clear']>().mockResolvedValue();
        const coordinator = new TunnelCoordinator(
            deps({
                tunnel: { open: () => Promise.resolve('https://p.trycloudflare.com'), stop },
                endpoint: { set: () => Promise.resolve(), clear }
            })
        );
        await coordinator.onPort(3000);

        await coordinator.stop();

        expect(stop).toHaveBeenCalledOnce();
        expect(clear).toHaveBeenCalledOnce();
    });

    it('stop does nothing when no tunnel opened', async () => {
        const stop = vi.fn();
        const clear = vi.fn<CoordinatorDeps['endpoint']['clear']>().mockResolvedValue();
        const coordinator = new TunnelCoordinator(
            deps({
                tunnel: { open: () => Promise.resolve('https://p.trycloudflare.com'), stop },
                endpoint: { set: () => Promise.resolve(), clear }
            })
        );

        await coordinator.stop();

        expect(stop).not.toHaveBeenCalled();
        expect(clear).not.toHaveBeenCalled();
    });
});
