import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { HostShutdown, HostStartup } from '@seedcord/types/internal';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi, type Mock } from 'vitest';

import { DevRunner } from '#commands/dev/DevRunner';
import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { DevLock } from '#core/state/DevLock';
import { StateFolder } from '#core/state/StateFolder';
import { ShellMode } from '#core/viteMode';
import { bindEnv } from '#tests/bindEnv';
import { APP_ID, FAKE_TOKEN } from '#tests/commands/build/smoke';
import { loadedConfig } from '#tests/loadedConfig';
import { lockDir, type LockDir } from '#tests/lockDir';
import { silentLogger } from '#tests/silentLogger';
import { DevStore } from '#ui/stores/DevStore';

import { devConfigFor } from './devConfigFor';
import { fakeBot, fakeRuntime } from './fakes';

import type { CodegenRunner } from '#commands/codegen/CodegenRunner';
import type { DevRunnerDeps } from '#commands/dev/DevRunner';
import type { DevRuntime } from '#commands/dev/runtime/DevRuntime';
import type { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';
import type { ILogger } from '@seedcord/types';

const readyBot = fakeBot();

const devConfig = devConfigFor(process.cwd(), 'bot.ts');

const STATE = new StateFolder(devConfig.root, silentLogger);

function loadedDevConfig(): ReturnType<typeof loadedConfig> {
    return loadedConfig(devConfig);
}

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

function makeRunner(overrides: Partial<DevRunnerDeps> = {}): DevRunner {
    return new DevRunner({
        projectLoader: { readConfig: () => Promise.resolve(loadedDevConfig()) },
        store: new DevStore(),
        state: STATE,
        lock: new DevLock(locks.path, silentLogger),
        codegen: fakeCodegen(),
        codegenLogger: silentLogger,
        tunnel: fakeTunnel(),
        runtime: readyRuntime,
        ...overrides
    });
}

// justified: the runner reads only route and stop off the router
function fakeTunnel(overrides: Partial<TunnelRouter> = {}): TunnelRouter {
    return { route: () => undefined, stop: () => Promise.resolve(), ...overrides } as TunnelRouter;
}

let locks: LockDir;

beforeEach(() => {
    const test = new DisposableStack();
    test.use(bindEnv({ DISCORD_BOT_TOKEN: FAKE_TOKEN }));
    locks = test.use(lockDir());
    return () => test.dispose();
});

// setImmediate runs after every queued promise callback
function settled(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

// resolves once the startup write has gone out, with the run loop still going until the test ends
async function startedRunner(codegen: FakeCodegen, codegenLogger: ILogger = silentLogger): Promise<DevRunner> {
    const runner = makeRunner({ codegen, codegenLogger });
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
        const runner = makeRunner({ tunnel: fakeTunnel({ stop }) });

        await runner.quit();

        expect(stop).toHaveBeenCalledOnce();
    });

    it('holds the run loop open until the teardown settles', async () => {
        vi.useFakeTimers();
        const order: string[] = [];
        const runner = makeRunner({
            tunnel: fakeTunnel({
                stop: () =>
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            order.push('teardown');
                            resolve();
                        }, 100);
                    })
            })
        });

        void runner.quit();
        const running = runner.run().then(() => order.push('run'));
        await vi.advanceTimersByTimeAsync(100);
        await running;

        expect(order).toStrictEqual(['teardown', 'run']);
    });

    it("holds the bot's application until the tunnel teardown finishes, even after quit stops waiting", async () => {
        const teardown = Promise.withResolvers<undefined>();
        const codegen = fakeCodegen();
        const runner = makeRunner({ codegen, tunnel: fakeTunnel({ stop: () => teardown.promise }) });
        const running = runner.run();
        await vi.waitFor(() => expect(codegen.writeFrom).toHaveBeenCalledOnce());
        const nextSession = (): void => new DevLock(locks.path, silentLogger).hold(APP_ID, '/bots/next');

        vi.useFakeTimers();
        const quitting = runner.quit();
        await vi.advanceTimersByTimeAsync(3000);
        await quitting;
        await running;
        expect(nextSession).toThrow(expect.objectContaining({ code: SeedcordErrorCode.CliDevAlreadyRunning }));

        vi.useRealTimers();
        teardown.resolve(undefined);
        await settled();

        expect(nextSession).not.toThrow();
    });

    it('resolves when the teardown outlasts its budget', async () => {
        vi.useFakeTimers();
        const runner = makeRunner({ tunnel: fakeTunnel({ stop: () => new Promise(() => undefined) }) });

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
    readonly readConfig: Mock;
    readonly configRequested: Promise<undefined>;
    readonly finishLoad: () => void;
}

// no session exists until finishLoad releases projectLoader.readConfig
function runWithSlowConfig(): SlowConfigRun {
    const start = vi.fn(() => Promise.resolve());
    const bot = { ...readyBot, start };
    const { promise: configRequested, resolve: markRequested } = Promise.withResolvers<undefined>();
    const { promise: configLoaded, resolve: release } = Promise.withResolvers<undefined>();
    const store = new DevStore();
    const readConfig = vi.fn(async () => {
        markRequested(undefined);
        await configLoaded;
        return loadedDevConfig();
    });
    const runner = makeRunner({
        projectLoader: { readConfig },
        store,
        runtime: () => ({ ...readyRuntime(), loadEntry: () => Promise.resolve({ module: { default: bot } }) })
    });
    const running = runner.run();
    return { runner, store, running, start, readConfig, configRequested, finishLoad: () => release(undefined) };
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
        const { runner, running, start, readConfig, configRequested, finishLoad } = runWithSlowConfig();
        onTestFinished(async () => {
            await runner.quit();
            await running;
        });

        await configRequested;
        await runner.restart();
        finishLoad();

        await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
        expect(readConfig).toHaveBeenCalledTimes(2);
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
        const runner = makeRunner({ runtime });
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
        const runner = makeRunner({ codegen, runtime });
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

const BUILD_STARTS = 'seedcordTestBuildStarts';

// vite calls buildStart once per server it opens
const COUNTING_CONFIG = `export default {
    root: './src',
    instance: './bot.ts',
    build: { start: './index.ts' },
    vitePlugins: () => [
        {
            name: 'count-build-starts',
            buildStart: () => {
                globalThis.${BUILD_STARTS} = (globalThis.${BUILD_STARTS} ?? 0) + 1;
            }
        }
    ]
};
`;

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
    it('reads the config once and shows a session that fails to start as an error', async () => {
        const projectLoader = {
            readConfig: vi.fn(() => Promise.resolve(loadedConfig(devConfigFor(process.cwd(), 'bot.ts'))))
        };
        const store = new DevStore();
        const runner = makeRunner({ projectLoader, store, runtime: () => new ServerDevRuntime() });

        const running = runner.run();
        const error = await untilError(store);
        await runner.quit();
        await running;

        expect(error.message).toMatch(/Cannot find \S+bot\.ts|Failed to load url/);
        expect(projectLoader.readConfig).toHaveBeenCalledOnce();
    });

    it("starts the config's Vite plugins once per session", async () => {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-runner-plugins-'));
        onTestFinished(() => temp.remove());
        await mkdir(join(temp.path, 'src'));
        await writeFile(
            join(temp.path, 'package.json'),
            JSON.stringify({ name: 'dev-runner-plugins', type: 'module' })
        );
        await writeFile(join(temp.path, 'seedcord.config.ts'), COUNTING_CONFIG);
        onTestFinished(() => {
            Reflect.deleteProperty(globalThis, BUILD_STARTS);
        });
        const loader = new ProjectLoader(openModuleLoader, new ShellMode());
        const store = new DevStore();
        const runner = makeRunner({
            projectLoader: { readConfig: () => loader.readConfig(temp.path) },
            store,
            runtime: () => new ServerDevRuntime()
        });

        const running = runner.run();
        // the session opens its vite server, then parks on the missing bot
        await untilError(store);
        await runner.quit();
        await running;

        expect(Reflect.get(globalThis, BUILD_STARTS)).toBe(1);
    }, 60_000);
});
