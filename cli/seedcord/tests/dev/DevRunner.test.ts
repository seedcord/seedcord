import { join } from 'node:path';

import { HostAugmentTarget, HostShutdown, HostStartup, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { DevRunner } from '#commands/dev/DevRunner';
import { ViteDevRuntime } from '#commands/dev/runtime/ViteDevRuntime';
import { silentLogger } from '#tests/silentLogger';
import { DevStore } from '#ui/stores/DevStore';

import type { CodegenRunner } from '#commands/codegen/CodegenRunner';
import type { DevRuntime } from '#commands/dev/runtime/DevRuntime';
import type { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';
import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ILogger } from '@seedcord/types';

const readyBot = {
    [SeedcordBrand]: true,
    [HostVersion]: '1.2.3',
    [HostAugmentTarget]: '@seedcord/gateway',
    start: () => Promise.resolve(),
    [HostStartup]: { abort: () => undefined },
    [HostShutdown]: { run: () => Promise.resolve() }
};

const devConfig = {
    root: process.cwd(),
    configFile: join(process.cwd(), 'seedcord.config.ts'),
    instance: join(process.cwd(), 'package.json'),
    typecheck: { enabled: false },
    idleAnimation: true
};

function readyRuntime(): DevRuntime {
    return {
        start: () => Promise.resolve(),
        loadEntry: () => Promise.resolve({ module: { default: readyBot } }),
        importModule: () => Promise.reject(new Error('the fake runtime loads no files')),
        dispose: () => Promise.resolve()
    };
}

const WRITTEN = { outputPath: 'seedcord-gen.d.ts', changed: true };

interface FakeCodegen {
    writeFrom: Mock<CodegenRunner['writeFrom']>;
}

function fakeCodegen(writeFrom = vi.fn<CodegenRunner['writeFrom']>().mockResolvedValue(WRITTEN)): FakeCodegen {
    return { writeFrom };
}

function makeRunner(
    codegen: FakeCodegen = fakeCodegen(),
    tunnel: TunnelRouter = fakeTunnel(),
    codegenLogger: ILogger = silentLogger
): DevRunner {
    const project = { config: devConfig, [Symbol.asyncDispose]: () => Promise.resolve() };
    return new DevRunner({
        // justified: the session reads only these config fields
        projectLoader: { open: () => Promise.resolve(project) } as unknown as Pick<ProjectLoader, 'open'>,
        store: new DevStore(),
        codegen,
        codegenLogger,
        tunnel,
        runtime: readyRuntime
    });
}

// justified: the runner reads only route and stop off the router
function fakeTunnel(overrides: Partial<TunnelRouter> = {}): TunnelRouter {
    return { route: () => undefined, stop: () => Promise.resolve(), ...overrides } as TunnelRouter;
}

// setImmediate runs after every queued promise callback
function settled(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

// resolves once the startup write has gone out, with the run loop still going
async function startedRunner(codegen: FakeCodegen): Promise<{ runner: DevRunner; stop: () => Promise<void> }> {
    const runner = makeRunner(codegen);
    const running = runner.run();
    await vi.waitFor(() => expect(codegen.writeFrom).toHaveBeenCalledOnce());
    return {
        runner,
        stop: async () => {
            await runner.quit();
            await running;
        }
    };
}

describe('DevRunner quit', () => {
    // a failing assertion mid-test would otherwise leave timers faked for the next one
    afterEach(() => {
        vi.useRealTimers();
    });

    it('tears the tunnel down', async () => {
        const stop = vi.fn().mockResolvedValue(undefined);
        const runner = makeRunner(fakeCodegen(), fakeTunnel({ stop }));

        await runner.quit();

        expect(stop).toHaveBeenCalledOnce();
    });

    it('holds the run loop open until the teardown settles', async () => {
        vi.useFakeTimers();
        const order: string[] = [];
        const runner = makeRunner(
            fakeCodegen(),
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
        const runner = makeRunner(fakeCodegen(), fakeTunnel({ stop: () => new Promise(() => undefined) }));

        const quitting = runner.quit();
        await vi.advanceTimersByTimeAsync(3000);

        await expect(quitting).resolves.toBeUndefined();
    });
});

describe('DevRunner codegen', () => {
    it('writes the types from the running bot once it is ready', async () => {
        const codegen = fakeCodegen();
        const { stop } = await startedRunner(codegen);

        expect(codegen.writeFrom).toHaveBeenCalledWith(expect.objectContaining({ instance: readyBot }));
        await stop();
    });

    it('regenerates when a refresh is accepted', async () => {
        const codegen = fakeCodegen();
        const { runner, stop } = await startedRunner(codegen);

        runner.refreshCommands(true);

        await vi.waitFor(() => expect(codegen.writeFrom).toHaveBeenCalledTimes(2));
        await stop();
    });

    it('does not regenerate when a refresh is declined', async () => {
        const codegen = fakeCodegen();
        const { runner, stop } = await startedRunner(codegen);

        runner.refreshCommands(false);

        expect(codegen.writeFrom).toHaveBeenCalledOnce();
        await stop();
    });

    it('logs a failed write and keeps the session running', async () => {
        const failure = new Error('duplicate route');
        const codegen = fakeCodegen(vi.fn<CodegenRunner['writeFrom']>().mockRejectedValue(failure));
        const error = vi.fn();
        const runner = makeRunner(codegen, fakeTunnel(), { ...silentLogger, error });
        const running = runner.run();

        await vi.waitFor(() => expect(error).toHaveBeenCalledWith(expect.any(String), failure));
        await runner.quit();
        await running;
    });

    it('skips a second write while one is in flight, then allows the next', async () => {
        const pending: PromiseWithResolvers<typeof WRITTEN>[] = [];
        const codegen = fakeCodegen(
            vi.fn<CodegenRunner['writeFrom']>(() => {
                const next = Promise.withResolvers<typeof WRITTEN>();
                pending.push(next);
                return next.promise;
            })
        );
        const { runner, stop } = await startedRunner(codegen);

        runner.refreshCommands(true);
        expect(codegen.writeFrom).toHaveBeenCalledOnce();

        pending[0]?.resolve(WRITTEN);
        await settled();
        runner.refreshCommands(true);
        expect(codegen.writeFrom).toHaveBeenCalledTimes(2);

        pending[1]?.resolve(WRITTEN);
        await stop();
    });
});

function untilError(store: DevStore): Promise<Error> {
    return new Promise((resolve) => {
        const check = (): void => {
            const { error } = store.getState();
            if (!error) return;
            store.off('change', check);
            resolve(error);
        };
        store.on('change', check);
    });
}

describe('DevRunner run', () => {
    it('opens the project once and shows a session that fails to start as an error', async () => {
        const projectDir = process.cwd();
        const instancePath = join(projectDir, 'src', 'bot.ts');
        const projectLoader = {
            open: vi.fn(() =>
                Promise.resolve({
                    config: {
                        instance: instancePath,
                        root: join(projectDir, 'src'),
                        configFile: join(projectDir, 'seedcord.config.ts'),
                        entry: instancePath,
                        build: { outDir: join(projectDir, 'dist') }
                    },
                    [Symbol.asyncDispose]: () => Promise.resolve()
                })
            )
        };
        const store = new DevStore();
        const runner = new DevRunner({
            // justified: the session reads only these config fields
            projectLoader: projectLoader as unknown as Pick<ProjectLoader, 'open'>,
            store,
            codegen: fakeCodegen(),
            codegenLogger: silentLogger,
            tunnel: fakeTunnel(),
            runtime: () => new ViteDevRuntime()
        });

        const running = runner.run();
        const error = await untilError(store);
        await runner.quit();
        await running;

        expect(error.message).toMatch(/Cannot find entry file|Failed to load url/);
        expect(projectLoader.open).toHaveBeenCalledOnce();
    });
});
