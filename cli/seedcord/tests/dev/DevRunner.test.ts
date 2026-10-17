import { join } from 'node:path';

import { HostShutdown, HostStartup } from '@seedcord/types/internal';
import { afterEach, describe, expect, it, onTestFinished, vi, type Mock } from 'vitest';

import { DevRunner } from '#commands/dev/DevRunner';
import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { StateFolder } from '#core/state/StateFolder';
import { silentLogger } from '#tests/silentLogger';
import { DevStore } from '#ui/stores/DevStore';

import { devConfigFor } from './devConfigFor';
import { fakeBot, fakeRuntime } from './fakes';

import type { CodegenRunner } from '#commands/codegen/CodegenRunner';
import type { DevRuntime } from '#commands/dev/runtime/DevRuntime';
import type { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';
import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ILogger } from '@seedcord/types';

const readyBot = fakeBot();

const devConfig = {
    root: process.cwd(),
    configFile: join(process.cwd(), 'seedcord.config.ts'),
    instance: join(process.cwd(), 'package.json'),
    target: { kind: 'server', entry: join(process.cwd(), 'package.json') },
    typecheck: { enabled: false },
    idleAnimation: true
};

const STATE = new StateFolder(devConfig.root, silentLogger);

function readyRuntime(): DevRuntime {
    return fakeRuntime({ default: readyBot });
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
    codegenLogger: ILogger = silentLogger,
    runtime: () => DevRuntime = readyRuntime
): DevRunner {
    const project = { config: devConfig, [Symbol.asyncDispose]: () => Promise.resolve() };
    return new DevRunner({
        // justified: the session reads only these config fields
        projectLoader: { open: () => Promise.resolve(project) } as unknown as Pick<ProjectLoader, 'open'>,
        store: new DevStore(),
        state: STATE,
        codegen,
        codegenLogger,
        tunnel,
        runtime
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

// resolves once the startup write has gone out, with the run loop still going until the test ends
async function startedRunner(codegen: FakeCodegen, codegenLogger: ILogger = silentLogger): Promise<DevRunner> {
    const runner = makeRunner(codegen, fakeTunnel(), codegenLogger);
    const running = runner.run();
    onTestFinished(async () => {
        await runner.quit();
        await running;
    });
    await vi.waitFor(() => expect(codegen.writeFrom).toHaveBeenCalledOnce());
    return runner;
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

interface SlowConfigRun {
    readonly runner: DevRunner;
    readonly store: DevStore;
    readonly running: Promise<void>;
    readonly start: Mock<() => Promise<void>>;
    readonly openConfig: Mock;
    readonly configRequested: Promise<undefined>;
    readonly finishLoad: () => void;
}

// no session exists until finishLoad releases projectLoader.open
function runWithSlowConfig(): SlowConfigRun {
    const start = vi.fn(() => Promise.resolve());
    const bot = { ...readyBot, start };
    const { promise: configRequested, resolve: markRequested } = Promise.withResolvers<undefined>();
    const { promise: configLoaded, resolve: release } = Promise.withResolvers<undefined>();
    const project = { config: devConfig, [Symbol.asyncDispose]: () => Promise.resolve() };
    const store = new DevStore();
    const openConfig = vi.fn(async () => {
        markRequested(undefined);
        await configLoaded;
        return project;
    });
    const runner = new DevRunner({
        // justified: the session reads only these config fields
        projectLoader: { open: openConfig } as unknown as Pick<ProjectLoader, 'open'>,
        store,
        state: STATE,
        codegen: fakeCodegen(),
        codegenLogger: silentLogger,
        tunnel: fakeTunnel(),
        runtime: () => ({ ...readyRuntime(), loadEntry: () => Promise.resolve({ module: { default: bot } }) })
    });
    const running = runner.run();
    return { runner, store, running, start, openConfig, configRequested, finishLoad: () => release(undefined) };
}

describe('DevRunner keys before a session exists', () => {
    it('keeps the bot offline after d during the config load', async () => {
        const { runner, store, running, start, configRequested, finishLoad } = runWithSlowConfig();
        onTestFinished(async () => {
            await runner.quit();
            await running;
        });

        await configRequested;
        await runner.disconnect();
        finishLoad();

        await vi.waitFor(() => expect(store.getState().phase).toBe('disconnected'));
        expect(start).not.toHaveBeenCalled();
    });

    it('ends the run without starting the bot after q during the config load', async () => {
        const { runner, running, start, configRequested, finishLoad } = runWithSlowConfig();

        await configRequested;
        const quitting = runner.quit();
        finishLoad();
        await quitting;
        await running;

        expect(start).not.toHaveBeenCalled();
    });

    it('reads the config again after r during the config load', async () => {
        const { runner, running, start, openConfig, configRequested, finishLoad } = runWithSlowConfig();
        onTestFinished(async () => {
            await runner.quit();
            await running;
        });

        await configRequested;
        await runner.restart();
        finishLoad();

        await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
        expect(openConfig).toHaveBeenCalledTimes(2);
    });
});

describe('DevRunner restart', () => {
    it('swaps in one new session when restarted while the bot starts', async () => {
        let started = 0;
        let stopped = 0;
        // the first bot hangs in startup until it is aborted, every later one starts at once
        const nextBot = (): typeof readyBot => {
            const aborted = Promise.withResolvers<undefined>();
            const hangs = started === 0;
            return {
                ...readyBot,
                start: () => {
                    started++;
                    return hangs ? aborted.promise : Promise.resolve();
                },
                [HostStartup]: { abort: () => void aborted.resolve(undefined) },
                [HostShutdown]: {
                    run: () => {
                        stopped++;
                        return Promise.resolve();
                    }
                }
            };
        };
        const runtime = (): DevRuntime => {
            const bot = nextBot();
            return { ...readyRuntime(), loadEntry: () => Promise.resolve({ module: { default: bot } }) };
        };
        const runner = makeRunner(fakeCodegen(), fakeTunnel(), silentLogger, runtime);
        const running = runner.run();
        onTestFinished(async () => {
            await runner.quit();
            await running;
        });
        await vi.waitFor(() => expect(started).toBe(1));

        await runner.restart();

        await vi.waitFor(() => expect(started).toBe(2));
        expect(started - stopped).toBe(1);
    });

    it('closes the runtime only after the type write that was running finishes', async () => {
        const order: string[] = [];
        const writing = Promise.withResolvers<undefined>();
        const codegen = fakeCodegen(
            vi.fn<CodegenRunner['writeFrom']>(async () => {
                order.push('write started');
                await writing.promise;
                order.push('write finished');
                return WRITTEN;
            })
        );
        const runtime = (): DevRuntime => {
            const ready = readyRuntime();
            return {
                ...ready,
                stop: async () => {
                    await ready.stop();
                    order.push('runtime stopped');
                }
            };
        };
        const runner = makeRunner(codegen, fakeTunnel(), silentLogger, runtime);
        const running = runner.run();
        onTestFinished(async () => {
            await runner.quit();
            await running;
        });
        await vi.waitFor(() => expect(order).toEqual(['write started']));

        const restarting = runner.restart();
        await settled();
        writing.resolve(undefined);
        await restarting;

        await vi.waitFor(() => expect(order).toContain('runtime stopped'));
        expect(order.indexOf('write finished')).toBeLessThan(order.indexOf('runtime stopped'));
    });
});

describe('DevRunner codegen', () => {
    it('writes the types from the running bot once it is ready', async () => {
        const codegen = fakeCodegen();
        await startedRunner(codegen);

        expect(codegen.writeFrom).toHaveBeenCalledWith(expect.objectContaining({ instance: readyBot }));
    });

    it('regenerates when a refresh is accepted', async () => {
        const codegen = fakeCodegen();
        const runner = await startedRunner(codegen);

        runner.refreshCommands(true);

        await vi.waitFor(() => expect(codegen.writeFrom).toHaveBeenCalledTimes(2));
    });

    it('does not regenerate when a refresh is declined', async () => {
        const codegen = fakeCodegen();
        const runner = await startedRunner(codegen);

        runner.refreshCommands(false);

        expect(codegen.writeFrom).toHaveBeenCalledOnce();
    });

    it('logs a failed write', async () => {
        const failure = new Error('duplicate route');
        const codegen = fakeCodegen(vi.fn<CodegenRunner['writeFrom']>().mockRejectedValue(failure));
        const error = vi.fn();
        await startedRunner(codegen, { ...silentLogger, error });

        await vi.waitFor(() => expect(error).toHaveBeenCalledWith(expect.any(String), failure));
    });

    it('runs one more write after the current one when refreshes arrive during it', async () => {
        const pending: PromiseWithResolvers<typeof WRITTEN>[] = [];
        const codegen = fakeCodegen(
            vi.fn<CodegenRunner['writeFrom']>(() => {
                const next = Promise.withResolvers<typeof WRITTEN>();
                pending.push(next);
                return next.promise;
            })
        );
        const runner = await startedRunner(codegen);

        runner.refreshCommands(true);
        runner.refreshCommands(true);
        expect(codegen.writeFrom).toHaveBeenCalledOnce();

        pending[0]?.resolve(WRITTEN);
        await settled();
        expect(codegen.writeFrom).toHaveBeenCalledTimes(2);

        pending[1]?.resolve(WRITTEN);
        await settled();
        expect(codegen.writeFrom).toHaveBeenCalledTimes(2);
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
        const projectLoader = {
            open: vi.fn(() =>
                Promise.resolve({
                    config: devConfigFor(projectDir, 'bot.ts'),
                    [Symbol.asyncDispose]: () => Promise.resolve()
                })
            )
        };
        const store = new DevStore();
        const runner = new DevRunner({
            // justified: the session reads only these config fields
            projectLoader: projectLoader as unknown as Pick<ProjectLoader, 'open'>,
            store,
            state: STATE,
            codegen: fakeCodegen(),
            codegenLogger: silentLogger,
            tunnel: fakeTunnel(),
            runtime: () => new ServerDevRuntime()
        });

        const running = runner.run();
        const error = await untilError(store);
        await runner.quit();
        await running;

        expect(error.message).toMatch(/Cannot find the entry file|Failed to load url/);
        expect(projectLoader.open).toHaveBeenCalledOnce();
    });
});
