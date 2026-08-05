import { describe, expect, it, vi } from 'vitest';

import { DevRunner } from '@commands/dev/DevRunner';
import { DevStore } from '@ui/stores/DevStore';

import { silentLogger } from '../silentLogger';

import type { CodegenRunner } from '@commands/codegen/CodegenRunner';
import type { TunnelCoordinator } from '@commands/dev/tunnel/TunnelCoordinator';
import type { ConfigLoader } from '@core/config/ConfigLoader';
import type { ConfigLocator } from '@core/config/ConfigLocator';
import type { ILogger } from '@seedcord/types';

// justified: these paths reach the codegen, the store, and the tunnel, so the locator and config loader
// stay empty stand-ins.
function makeRunner(
    codegen: { run: ReturnType<typeof vi.fn> },
    tunnel?: TunnelCoordinator,
    tunnelLogger: ILogger = silentLogger
): DevRunner {
    return new DevRunner({
        locator: {} as unknown as ConfigLocator,
        configLoader: {} as unknown as ConfigLoader,
        store: new DevStore(),
        codegen: codegen as unknown as CodegenRunner,
        codegenLogger: silentLogger,
        tunnel,
        tunnelLogger
    });
}

// justified: the runner reads only onPort and stop off the coordinator
function fakeTunnel(overrides: Partial<TunnelCoordinator> = {}): TunnelCoordinator {
    return { onPort: () => Promise.resolve(), stop: () => Promise.resolve(), ...overrides } as TunnelCoordinator;
}

describe('DevRunner tunnel routing', () => {
    it('hands the bound port to the tunnel', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const runner = makeRunner({ run: vi.fn() }, fakeTunnel({ onPort }));

        runner.routeToTunnel(true, { type: 'server-listening', port: 4321 });

        expect(onPort).toHaveBeenCalledExactlyOnceWith(4321);
    });

    it('stays out of the way when the config turns the tunnel off', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const warn = vi.fn();
        const runner = makeRunner({ run: vi.fn() }, fakeTunnel({ onPort }), { ...silentLogger, warn });

        runner.routeToTunnel(false, { type: 'server-listening', port: 4321 });

        expect(onPort).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    it('ignores every event that is not a bound port', () => {
        const onPort = vi.fn().mockResolvedValue(undefined);
        const runner = makeRunner({ run: vi.fn() }, fakeTunnel({ onPort }));

        runner.routeToTunnel(true, { type: 'ready' });

        expect(onPort).not.toHaveBeenCalled();
    });

    it('names the install command once when cloudflared is absent', () => {
        const warn = vi.fn();
        const runner = makeRunner({ run: vi.fn() }, undefined, { ...silentLogger, warn });

        runner.routeToTunnel(true, { type: 'server-listening', port: 1 });
        runner.routeToTunnel(true, { type: 'server-listening', port: 2 });

        expect(warn).toHaveBeenCalledOnce();
    });
});

describe('DevRunner quit', () => {
    it('tears the tunnel down', async () => {
        const stop = vi.fn().mockResolvedValue(undefined);
        const runner = makeRunner({ run: vi.fn() }, fakeTunnel({ stop }));

        await runner.quit();

        expect(stop).toHaveBeenCalledOnce();
    });

    it('resolves when the teardown outlasts its budget', async () => {
        const runner = makeRunner({ run: vi.fn() }, fakeTunnel({ stop: () => new Promise(() => undefined) }));

        await expect(runner.quit()).resolves.toBeUndefined();
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
