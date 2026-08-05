import { describe, expect, it, vi } from 'vitest';

import { TunnelCoordinator } from '@commands/dev/tunnel/TunnelCoordinator';

import { silentLogger } from '../silentLogger';

import type { CoordinatorDeps, CoordinatorTunnel } from '@commands/dev/tunnel/TunnelCoordinator';

function urlFor(port: number): string {
    return `https://p${String(port)}.trycloudflare.com`;
}

function deps(overrides: Partial<CoordinatorDeps> = {}): CoordinatorDeps {
    return {
        makeTunnel: () => ({ open: (port) => Promise.resolve(urlFor(port)), stop: () => undefined }),
        endpoint: { set: () => Promise.resolve(), clear: () => Promise.resolve() },
        onUrl: () => undefined,
        logger: silentLogger,
        ...overrides
    };
}

describe('TunnelCoordinator', () => {
    it('opens the tunnel, then writes the endpoint', async () => {
        const order: string[] = [];
        const coordinator = new TunnelCoordinator(
            deps({
                makeTunnel: () => ({
                    open: (port) => {
                        order.push('open');
                        return Promise.resolve(urlFor(port));
                    },
                    stop: () => undefined
                }),
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

        expect(order).toEqual(['open', 'set']);
    });

    it('writes the endpoint the tunnel reported', async () => {
        const set = vi.fn<CoordinatorDeps['endpoint']['set']>().mockResolvedValue();
        const coordinator = new TunnelCoordinator(deps({ endpoint: { set, clear: () => Promise.resolve() } }));

        await coordinator.onPort(4321);

        expect(set).toHaveBeenCalledExactlyOnceWith(urlFor(4321), expect.any(AbortSignal));
    });

    it('leaves the tunnel alone when the port is unchanged', async () => {
        const open = vi.fn<CoordinatorTunnel['open']>().mockResolvedValue(urlFor(3000));
        const coordinator = new TunnelCoordinator(deps({ makeTunnel: () => ({ open, stop: () => undefined }) }));

        await coordinator.onPort(3000);
        await coordinator.onPort(3000);

        expect(open).toHaveBeenCalledOnce();
    });

    it('replaces the tunnel when a restart binds a different port', async () => {
        const open = vi.fn<CoordinatorTunnel['open']>().mockResolvedValue(urlFor(1));
        const stop = vi.fn();
        const coordinator = new TunnelCoordinator(deps({ makeTunnel: () => ({ open, stop }) }));

        await coordinator.onPort(3000);
        await coordinator.onPort(3001);

        expect(stop).toHaveBeenCalledOnce();
        expect(open).toHaveBeenCalledTimes(2);
    });

    it('stops a superseded attempt before its open settles', async () => {
        const stopped: string[] = [];
        const slow = Promise.withResolvers<string>();
        let made = 0;
        const coordinator = new TunnelCoordinator(
            deps({
                makeTunnel: () => {
                    const label = `t${String(++made)}`;
                    return {
                        open: (port) => (label === 't1' ? slow.promise : Promise.resolve(urlFor(port))),
                        stop: () => stopped.push(label)
                    };
                }
            })
        );

        const stale = coordinator.onPort(3000);
        await coordinator.onPort(3001);

        expect(stopped).toEqual(['t1']);

        slow.resolve(urlFor(3000));
        await stale;
    });

    it('a superseded attempt stops its own tunnel and reports nothing', async () => {
        const stopped: string[] = [];
        const slow = Promise.withResolvers<string>();
        const onUrl = vi.fn();
        let made = 0;
        const coordinator = new TunnelCoordinator(
            deps({
                makeTunnel: () => {
                    const label = `t${String(++made)}`;
                    return {
                        open: (port) => (label === 't1' ? slow.promise : Promise.resolve(urlFor(port))),
                        stop: () => stopped.push(label)
                    };
                },
                onUrl
            })
        );

        const stale = coordinator.onPort(3000);
        await coordinator.onPort(3001);
        slow.resolve(urlFor(3000));
        await stale;

        expect(stopped).toEqual(['t1']);
        expect(onUrl).toHaveBeenCalledExactlyOnceWith(urlFor(3001));
    });

    it('stops a tunnel that opens after stop was called', async () => {
        const stopped: string[] = [];
        const slow = Promise.withResolvers<string>();
        const coordinator = new TunnelCoordinator(
            deps({ makeTunnel: () => ({ open: () => slow.promise, stop: () => stopped.push('t1') }) })
        );

        const opening = coordinator.onPort(3000);
        await coordinator.stop();
        slow.resolve(urlFor(3000));
        await opening;

        expect(stopped).toEqual(['t1']);
    });

    it('logs an error and keeps the session running when the endpoint write fails', async () => {
        const error = vi.fn();
        const coordinator = new TunnelCoordinator(
            deps({
                endpoint: { set: () => Promise.reject(new Error('403')), clear: () => Promise.resolve() },
                logger: { ...silentLogger, error }
            })
        );

        await expect(coordinator.onPort(3000)).resolves.toBeUndefined();
        expect(error).toHaveBeenCalledOnce();
    });

    it('retries the same port after a failure', async () => {
        const open = vi.fn<CoordinatorTunnel['open']>().mockResolvedValue(urlFor(3000));
        const set = vi
            .fn<CoordinatorDeps['endpoint']['set']>()
            .mockRejectedValueOnce(new Error('403'))
            .mockResolvedValueOnce();
        const coordinator = new TunnelCoordinator(
            deps({
                makeTunnel: () => ({ open, stop: () => undefined }),
                endpoint: { set, clear: () => Promise.resolve() }
            })
        );

        await coordinator.onPort(3000);
        await coordinator.onPort(3000);

        expect(open).toHaveBeenCalledTimes(2);
    });

    it('reports the live url, then drops it on stop', async () => {
        const onUrl = vi.fn();
        const coordinator = new TunnelCoordinator(deps({ onUrl }));

        await coordinator.onPort(3000);
        expect(onUrl).toHaveBeenCalledExactlyOnceWith(urlFor(3000));

        await coordinator.stop();
        expect(onUrl).toHaveBeenLastCalledWith(null);
    });

    it('drops the url when the setup fails', async () => {
        const onUrl = vi.fn();
        const coordinator = new TunnelCoordinator(
            deps({
                endpoint: { set: () => Promise.reject(new Error('403')), clear: () => Promise.resolve() },
                onUrl
            })
        );

        await coordinator.onPort(3000);

        expect(onUrl).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('stop kills the tunnel and clears the endpoint', async () => {
        const stop = vi.fn();
        const clear = vi.fn<CoordinatorDeps['endpoint']['clear']>().mockResolvedValue();
        const coordinator = new TunnelCoordinator(
            deps({
                makeTunnel: () => ({ open: () => Promise.resolve(urlFor(1)), stop }),
                endpoint: { set: () => Promise.resolve(), clear }
            })
        );
        await coordinator.onPort(3000);

        await coordinator.stop();

        expect(stop).toHaveBeenCalledOnce();
        expect(clear).toHaveBeenCalledOnce();
    });

    it('warns and resolves when the clearing patch fails', async () => {
        const warn = vi.fn();
        const coordinator = new TunnelCoordinator(
            deps({
                endpoint: { set: () => Promise.resolve(), clear: () => Promise.reject(new Error('401')) },
                logger: { ...silentLogger, warn }
            })
        );
        await coordinator.onPort(3000);

        await expect(coordinator.stop()).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledOnce();
    });

    it('stop does nothing when no tunnel opened', async () => {
        const stop = vi.fn();
        const clear = vi.fn<CoordinatorDeps['endpoint']['clear']>().mockResolvedValue();
        const coordinator = new TunnelCoordinator(
            deps({
                makeTunnel: () => ({ open: () => Promise.resolve(urlFor(1)), stop }),
                endpoint: { set: () => Promise.resolve(), clear }
            })
        );

        await coordinator.stop();

        expect(stop).not.toHaveBeenCalled();
        expect(clear).not.toHaveBeenCalled();
    });
});
