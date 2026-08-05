import { afterEach, describe, expect, it, vi } from 'vitest';

import { DevRunner } from '@commands/dev/DevRunner';
import { DevStore } from '@ui/stores/DevStore';

import { silentLogger } from '../silentLogger';

import type { CodegenRunner } from '@commands/codegen/CodegenRunner';
import type { TunnelRouter } from '@commands/dev/tunnel/TunnelRouter';
import type { ConfigLoader } from '@core/config/ConfigLoader';
import type { ConfigLocator } from '@core/config/ConfigLocator';

// justified: these paths never touch the locator or the config loader
function makeRunner(codegen: { run: ReturnType<typeof vi.fn> }, tunnel: TunnelRouter = fakeTunnel()): DevRunner {
    return new DevRunner({
        locator: {} as unknown as ConfigLocator,
        configLoader: {} as unknown as ConfigLoader,
        store: new DevStore(),
        codegen: codegen as unknown as CodegenRunner,
        codegenLogger: silentLogger,
        tunnel
    });
}

// justified: the runner reads only route and stop off the router
function fakeTunnel(overrides: Partial<TunnelRouter> = {}): TunnelRouter {
    return { route: () => undefined, stop: () => Promise.resolve(), ...overrides } as TunnelRouter;
}

describe('DevRunner quit', () => {
    // a failing assertion mid-test would otherwise leave timers faked for the next one
    afterEach(() => {
        vi.useRealTimers();
    });

    it('tears the tunnel down', async () => {
        const stop = vi.fn().mockResolvedValue(undefined);
        const runner = makeRunner({ run: vi.fn() }, fakeTunnel({ stop }));

        await runner.quit();

        expect(stop).toHaveBeenCalledOnce();
    });

    it('holds the run loop open until the teardown settles', async () => {
        vi.useFakeTimers();
        const order: string[] = [];
        const runner = makeRunner(
            { run: vi.fn() },
            fakeTunnel({
                stop: () =>
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            order.push('teardown');
                            resolve();
                        }, 100);
                    })
            })
        );

        void runner.quit();
        const running = runner.run().then(() => order.push('run'));
        await vi.advanceTimersByTimeAsync(100);
        await running;

        expect(order).toStrictEqual(['teardown', 'run']);
    });

    it('resolves when the teardown outlasts its budget', async () => {
        vi.useFakeTimers();
        const runner = makeRunner({ run: vi.fn() }, fakeTunnel({ stop: () => new Promise(() => undefined) }));

        const quitting = runner.quit();
        await vi.advanceTimersByTimeAsync(3000);

        await expect(quitting).resolves.toBeUndefined();
    });
});

describe('DevRunner command refresh', () => {
    it('regenerates the registry when a refresh is accepted', async () => {
        const codegen = { run: vi.fn().mockResolvedValue(undefined) };
        makeRunner(codegen).refreshCommands(true);
        await vi.waitFor(() => {
            expect(codegen.run).toHaveBeenCalledWith(false);
        });
    });

    it('does not regenerate when a refresh is declined', () => {
        const codegen = { run: vi.fn().mockResolvedValue(undefined) };
        makeRunner(codegen).refreshCommands(false);
        expect(codegen.run).not.toHaveBeenCalled();
    });

    it('swallows a regeneration failure so the dev session keeps running', async () => {
        const codegen = { run: vi.fn().mockRejectedValue(new Error('duplicate route')) };
        makeRunner(codegen).refreshCommands(true);
        await vi.waitFor(() => {
            expect(codegen.run).toHaveBeenCalledWith(false);
        });
    });

    it('skips a second regeneration while one is in flight, then allows the next', async () => {
        let release: () => void = () => undefined;
        const codegen = {
            run: vi.fn(() => {
                // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void is valid here as a Promise resolution type
                const { promise, resolve } = Promise.withResolvers<void>();
                release = resolve;
                return promise;
            })
        };
        const runner = makeRunner(codegen);

        runner.refreshCommands(true);
        runner.refreshCommands(true);
        expect(codegen.run).toHaveBeenCalledTimes(1);

        release();
        await vi.waitFor(() => expect(codegen.run).toHaveBeenCalledTimes(1));

        runner.refreshCommands(true);
        expect(codegen.run).toHaveBeenCalledTimes(2);
    });
});
