import { join } from 'node:path';

import { HostAugmentTarget, HostShutdown, HostStartup, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DevRunner } from '#commands/dev/DevRunner';
import { ViteDevRuntime } from '#commands/dev/runtime/ViteDevRuntime';
import { silentLogger } from '#tests/silentLogger';
import { DevStore } from '#ui/stores/DevStore';

import type { CodegenRunner } from '#commands/codegen/CodegenRunner';
import type { DevRuntime } from '#commands/dev/runtime/DevRuntime';
import type { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';
import type { ProjectLoader } from '#core/config/ProjectLoader';

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
    } as DevRuntime;
}

interface FakeCodegen {
    writeFrom: ReturnType<typeof vi.fn>;
}

function fakeCodegen(writeFrom = vi.fn().mockResolvedValue({ outputPath: 'seedcord-gen.d.ts' })): FakeCodegen {
    return { writeFrom };
}

// justified: the session reads only these config fields. writeFrom is all the runner calls on codegen.
function makeRunner(codegen: FakeCodegen = fakeCodegen(), tunnel: TunnelRouter = fakeTunnel()): DevRunner {
    const project = { config: devConfig, [Symbol.asyncDispose]: () => Promise.resolve() };
    return new DevRunner({
        projectLoader: { open: () => Promise.resolve(project) } as unknown as ProjectLoader,
        store: new DevStore(),
        codegen: codegen as unknown as CodegenRunner,
        codegenLogger: silentLogger,
        tunnel,
        runtime: readyRuntime
    });
}

// justified: the runner reads only route and stop off the router
function fakeTunnel(overrides: Partial<TunnelRouter> = {}): TunnelRouter {
    return { route: () => undefined, stop: () => Promise.resolve(), ...overrides } as TunnelRouter;
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

    it('keeps the session running when a regeneration fails', async () => {
        const codegen = fakeCodegen(vi.fn().mockRejectedValue(new Error('duplicate route')));
        const runner = makeRunner(codegen);
        const running = runner.run();

        await vi.waitFor(() => expect(codegen.writeFrom).toHaveBeenCalledOnce());
        runner.refreshCommands(true);
        await vi.waitFor(() => expect(codegen.writeFrom).toHaveBeenCalledTimes(2));

        await runner.quit();
        await running;
    });

    it('skips a second regeneration while one is in flight, then allows the next', async () => {
        let release: () => void = () => undefined;
        const codegen = fakeCodegen(
            vi.fn(() => {
                // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void is valid here as a Promise resolution type
                const { promise, resolve } = Promise.withResolvers<void>();
                release = resolve;
                return promise;
            })
        );
        const { runner, stop } = await startedRunner(codegen);

        runner.refreshCommands(true);
        expect(codegen.writeFrom).toHaveBeenCalledOnce();

        release();
        await vi.waitFor(() => {
            runner.refreshCommands(true);
            expect(codegen.writeFrom).toHaveBeenCalledTimes(2);
        });
        release();
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
        // justified: the session reads only these config fields. a session that never starts never calls codegen.
        const runner = new DevRunner({
            projectLoader: projectLoader as unknown as ProjectLoader,
            store,
            codegen: fakeCodegen() as unknown as CodegenRunner,
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
