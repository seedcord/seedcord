import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, expectTypeOf, afterEach, vi } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '@node/Pluggable';
import { ShutdownPhase, StartupPhase } from '@src/lifecycle/phases';
import { Plugin } from '@src/plugin/Plugin';
import { Bus } from '@subscribers/Bus';

import type { CoreBase } from '@interfaces/CoreBase';
import type { Config, IRateLimiter } from '@seedcord/types';
import type { PluginCapabilities, PluginContext } from '@src/plugin/context';
import type { PluginArgs } from '@src/plugin/Plugin';

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class TestPlugin extends Plugin {
    public initCalls = 0;

    constructor(
        core: CoreBase,
        public readonly tag: string
    ) {
        super(core);
    }

    public init(): Promise<void> {
        this.initCalls++;
        this.onInit?.();
        return Promise.resolve();
    }

    public override dispose(): Promise<void> {
        this.onDispose?.();
        return Promise.resolve();
    }

    public reachCtx(): PluginContext {
        return this.ctx;
    }

    public onInit?: () => void;
    public onDispose?: () => void;
}

class TestHost extends Pluggable<'gateway', 'server'> {
    public readonly config: Config;
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup, config: Config = {} as Config) {
        super(shutdown, startup);
        this.config = config;
        this.bus = new Bus(this);
    }

    public run(): Promise<this> {
        return this.init();
    }

    public static resetHost(): void {
        Pluggable.reset();
    }
}

function makeHost(): { host: TestHost; startup: CoordinatedStartup; shutdown: CoordinatedShutdown } {
    const startup = new CoordinatedStartup();
    const shutdown = new CoordinatedShutdown();
    return { host: new TestHost(shutdown, startup), startup, shutdown };
}

describe('Pluggable', () => {
    afterEach(() => {
        TestHost.resetHost();
        vi.restoreAllMocks();
    });

    it('attaches without a phase argument and threads ctor args', async () => {
        const { host, startup } = makeHost();

        const withDb = host.attach('db', TestPlugin, 'hello');

        expect(withDb.db).toBeInstanceOf(TestPlugin);
        expect(withDb.db.tag).toBe('hello');

        await host.run();
        expect(withDb.db.initCalls).toBe(1);
        expect(startup.isReady).toBe(true);
    });

    it('runs plugin init inside the Configuration phase by default', async () => {
        const { host, startup } = makeHost();

        const withDb = host.attach('db', TestPlugin, 'x');

        await host.run();
        expect(withDb.db.initCalls).toBe(1);
        expect(startup.removeTask(StartupPhase.Configuration, 'Plugins:init')).toBe(true);
    });

    it('runs plugin inits sequentially in attach order within a phase', async () => {
        class SlowInit extends TestPlugin {
            public override async init(): Promise<void> {
                await delay(20);
                this.initCalls++;
                this.onInit?.();
            }
        }

        const { host } = makeHost();
        const order: string[] = [];
        const a = host.attach('a', SlowInit, 'a').a;
        const b = host.attach('b', TestPlugin, 'b').b;
        a.onInit = () => order.push('a');
        b.onInit = () => order.push('b');

        await host.run();
        expect(order).toEqual(['a', 'b']);
    });

    describe('ctx', () => {
        it('finalizes ctx with the config and the store', () => {
            const { host } = makeHost();
            const withDb = host.attach('db', TestPlugin, 'x');

            const ctx = withDb.db.reachCtx();
            expect(ctx.config).toBe(host.config);
            expect(ctx.store).toBe(host.rateLimiter);
        });

        it('finalizes ctx.store from a configured config.store over the fallback rate limiter', () => {
            const store = new MemoryRateLimiter();
            const startup = new CoordinatedStartup();
            // justified: pluginStore only reads config.store
            const host = new TestHost(new CoordinatedShutdown(), startup, { store } as unknown as Config);

            const withDb = host.attach('db', TestPlugin, 'x');
            const ctx = withDb.db.reachCtx();

            expect(ctx.store).toBe(store);
            expect(ctx.store).not.toBe(host.rateLimiter);
        });

        it('reads ctx.token live, reflecting a token resolved after attach', () => {
            class TokenHost extends TestHost {
                public liveToken: string | undefined;
                protected override pluginCapabilities(): PluginCapabilities {
                    return { token: this.liveToken };
                }
            }

            const host = new TokenHost(new CoordinatedShutdown(), new CoordinatedStartup());
            const ctx = host.attach('db', TestPlugin, 'x').db.reachCtx();

            expect(ctx.token).toBeUndefined();
            host.liveToken = 'set-after-attach';
            expect(ctx.token).toBe('set-after-attach');
        });
    });

    describe('dispose', () => {
        it('registers the combined dispose task only after an init resolves', async () => {
            const { host, shutdown } = makeHost();
            host.attach('db', TestPlugin, 'x');

            expect(shutdown.removeTask(ShutdownPhase.Disconnect, 'Plugins:dispose')).toBe(false);

            await host.run();
            expect(shutdown.removeTask(ShutdownPhase.Disconnect, 'Plugins:dispose')).toBe(true);
        });

        it('disposes in reverse attach order at shutdown', async () => {
            const { host, shutdown } = makeHost();
            const order: string[] = [];
            const a = host.attach('a', TestPlugin, 'a').a;
            const b = host.attach('b', TestPlugin, 'b').b;
            a.onDispose = () => order.push('a');
            b.onDispose = () => order.push('b');

            await host.run();
            await shutdown.run(0, false);

            expect(order).toEqual(['b', 'a']);
        });

        it('surfaces a dispose failure phase on the shutdown-failed log', async () => {
            class FailingDispose extends TestPlugin {
                public override dispose(): Promise<void> {
                    return Promise.reject(new Error(`dispose-failed-${this.tag}`));
                }
            }

            const { host, shutdown } = makeHost();
            host.attach('a', FailingDispose, 'a');
            host.attach('b', FailingDispose, 'b');
            await host.run();

            const errors = vi.spyOn(Logger.prototype, 'error');
            await shutdown.run(0, false);

            const call = errors.mock.calls.find(([msg]) => String(msg).includes('Coordinated shutdown failed'));
            const [failure] = call?.slice(1) ?? [];
            expect(isSeedcordError(failure, undefined, SeedcordErrorCode.LifecyclePhaseFailures)).toBe(true);
            expect((failure as Error).message).toContain('Disconnect');
        });

        it('a shared non-default dispose phase runs both disposes in reverse attach order', async () => {
            const order: string[] = [];
            class LogoutDisposer extends Plugin {
                constructor(
                    core: CoreBase,
                    private readonly tag: string
                ) {
                    super(core, { dispose: { phase: ShutdownPhase.Logout } });
                }
                public init(): Promise<void> {
                    return Promise.resolve();
                }
                public override dispose(): Promise<void> {
                    order.push(this.tag);
                    return Promise.resolve();
                }
            }

            const { host, shutdown } = makeHost();
            host.attach('a', LogoutDisposer, 'a');
            host.attach('b', LogoutDisposer, 'b');

            await host.run();
            await shutdown.run(0, false);

            expect(order).toEqual(['b', 'a']);
        });
    });

    it('runs a Ready-phase init before the ready hooks', async () => {
        const order: string[] = [];
        class ReadyPhaseInit extends Plugin {
            constructor(core: CoreBase) {
                super(core, { init: { phase: StartupPhase.Ready } });
            }
            public async init(): Promise<void> {
                await delay(20);
                order.push('init');
            }
            public override ready(): Promise<void> {
                order.push('ready');
                return Promise.resolve();
            }
        }

        const { host } = makeHost();
        host.attach('rp', ReadyPhaseInit);

        await host.run();
        expect(order).toEqual(['init', 'ready']);
    });

    it('runs a Login-phase init after the Configuration phase completes', async () => {
        const order: string[] = [];
        class LoginInit extends Plugin {
            constructor(core: CoreBase) {
                super(core, { init: { phase: StartupPhase.Login } });
            }
            public init(): Promise<void> {
                order.push('login-init');
                return Promise.resolve();
            }
        }

        const { host } = makeHost();
        host.attach('l', LoginInit);
        const c = host.attach('c', TestPlugin, 'c').c;
        c.onInit = () => order.push('config-init');

        await host.run();
        expect(order).toEqual(['config-init', 'login-init']);
    });

    it('runs each dispose in its declared phase', async () => {
        const order: string[] = [];
        class LogoutDispose extends Plugin {
            constructor(core: CoreBase) {
                super(core, { dispose: { phase: ShutdownPhase.Logout } });
            }
            public init(): Promise<void> {
                return Promise.resolve();
            }
            public override dispose(): Promise<void> {
                order.push('logout-dispose');
                return Promise.resolve();
            }
        }

        const { host, shutdown } = makeHost();
        host.attach('ld', LogoutDispose);
        const dd = host.attach('dd', TestPlugin, 'dd').dd;
        dd.onDispose = () => order.push('disconnect-dispose');

        await host.run();
        await shutdown.run(0, false);

        expect(order).toEqual(['disconnect-dispose', 'logout-dispose']);
    });

    it('runs ready hooks sequentially in attach order at Ready', async () => {
        class SlowReady extends TestPlugin {
            public onReady?: () => void;
            public override async ready(): Promise<void> {
                await delay(20);
                this.onReady?.();
            }
        }
        class FastReady extends TestPlugin {
            public onReady?: () => void;
            public override ready(): Promise<void> {
                this.onReady?.();
                return Promise.resolve();
            }
        }

        const { host } = makeHost();
        const order: string[] = [];
        const a = host.attach('a', SlowReady, 'a').a;
        const b = host.attach('b', FastReady, 'b').b;
        a.onInit = () => order.push('init-a');
        b.onInit = () => order.push('init-b');
        a.onReady = () => order.push('ready-a');
        b.onReady = () => order.push('ready-b');

        await host.run();
        expect(order).toEqual(['init-a', 'init-b', 'ready-a', 'ready-b']);
    });

    it('registers no Ready task when no plugin declares ready or a Ready-phase init', async () => {
        const { host, startup } = makeHost();
        const addTask = vi.spyOn(startup, 'addTask');
        host.attach('db', TestPlugin, 'x');

        await host.run();

        const readyPlugins = addTask.mock.calls.filter(
            ([phase, name]) => phase === StartupPhase.Ready && name === 'Plugins'
        );
        expect(readyPlugins).toHaveLength(0);
    });

    it('never runs ready when an init fails', async () => {
        class ReadyPlugin extends TestPlugin {
            public readyRan = false;
            public override init(): Promise<void> {
                return Promise.reject(new Error('boom'));
            }
            public override ready(): Promise<void> {
                this.readyRan = true;
                return Promise.resolve();
            }
        }

        const { host } = makeHost();
        const p = host.attach('db', ReadyPlugin, 'x').db;

        await expect(host.run()).rejects.toThrow();
        expect(p.readyRan).toBe(false);
    });

    it('never runs ready hooks when a Ready-phase init rejects', async () => {
        const order: string[] = [];
        class FailingReadyInit extends Plugin {
            constructor(core: CoreBase) {
                super(core, { init: { phase: StartupPhase.Ready } });
            }
            public init(): Promise<void> {
                return Promise.reject(new Error('ready-init failed'));
            }
        }
        class OnlyReady extends Plugin {
            constructor(core: CoreBase) {
                super(core);
            }
            public init(): Promise<void> {
                return Promise.resolve();
            }
            public override ready(): Promise<void> {
                order.push('ready');
                return Promise.resolve();
            }
        }

        const { host } = makeHost();
        host.attach('fi', FailingReadyInit);
        host.attach('or', OnlyReady);

        await expect(host.run()).rejects.toThrow();
        expect(order).toEqual([]);
    });

    it('disposes completed inits in reverse attach order on a failed startup', async () => {
        const { host } = makeHost();
        const order: string[] = [];
        const a = host.attach('a', TestPlugin, 'a').a;
        const b = host.attach('b', TestPlugin, 'b').b;
        const c = host.attach('c', TestPlugin, 'c').c;
        c.onInit = () => {
            throw new Error('c failed');
        };
        a.onDispose = () => order.push('a');
        b.onDispose = () => order.push('b');
        c.onDispose = () => order.push('c');

        await expect(host.run()).rejects.toThrow();
        expect(order).toEqual(['b', 'a']);
    });

    it('rolls back three completed inits in reverse when the fourth fails', async () => {
        const { host } = makeHost();
        const order: string[] = [];
        const a = host.attach('a', TestPlugin, 'a').a;
        const b = host.attach('b', TestPlugin, 'b').b;
        const c = host.attach('c', TestPlugin, 'c').c;
        const d = host.attach('d', TestPlugin, 'd').d;
        for (const plugin of [a, b, c, d]) {
            plugin.onDispose = () => order.push(plugin.tag);
        }
        d.onInit = () => {
            throw new Error('d failed');
        };

        await expect(host.run()).rejects.toThrow();
        expect(order).toEqual(['c', 'b', 'a']);
    });

    it('propagates the startup error when a rollback dispose rejects', async () => {
        const { host } = makeHost();
        const a = host.attach('a', TestPlugin, 'a').a;
        const b = host.attach('b', TestPlugin, 'b').b;
        a.onDispose = () => {
            throw new Error('dispose blew up');
        };
        b.onInit = () => {
            throw new Error('startup failed');
        };

        const error: unknown = await host.run().then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.LifecyclePhaseFailures)).toBe(true);
        expect((error as Error).message).not.toContain('dispose blew up');
    });

    it('a full shutdown after a failed start does not re-dispose the rolled-back plugins', async () => {
        const { host, shutdown } = makeHost();
        const disposes: string[] = [];
        const a = host.attach('a', TestPlugin, 'a').a;
        const b = host.attach('b', TestPlugin, 'b').b;
        a.onDispose = () => disposes.push('a');
        b.onInit = () => {
            throw new Error('b failed');
        };

        await expect(host.run()).rejects.toThrow();
        expect(disposes).toEqual(['a']);

        await shutdown.run(1, false);
        expect(disposes).toEqual(['a']);
    });

    it('rejects a rerun after a failed startup', async () => {
        const { host } = makeHost();
        const withDb = host.attach('db', TestPlugin, 'x');
        withDb.db.onInit = () => {
            throw new Error('boom');
        };

        await expect(host.run()).rejects.toThrow();

        const error: unknown = await host.run().then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.LifecycleRestartAfterFailure)).toBe(true);
    });

    it('rejects a duplicate key', () => {
        const { host } = makeHost();
        host.attach('db', TestPlugin, 'one');
        expect(() => host.attach('db', TestPlugin, 'two')).toThrow(/db/);
    });

    it('rejects attach after init', async () => {
        const { host } = makeHost();
        await host.run();
        try {
            host.attach('late', TestPlugin, 'x');
            expect.fail('expected a throw');
        } catch (err) {
            expect(isSeedcordError(err, undefined, SeedcordErrorCode.CorePluginAfterInit)).toBe(true);
        }
    });

    it('rejects a key colliding with a host property', () => {
        const { host } = makeHost();
        expect(() => host.attach('shutdown', TestPlugin, 'x')).toThrow(/shutdown/);
    });

    it('run is idempotent', async () => {
        const { host } = makeHost();
        const withDb = host.attach('db', TestPlugin, 'x');

        await host.run();
        await host.run();
        expect(withDb.db.initCalls).toBe(1);
    });

    it('infers the concrete ctor args at the attach call site', () => {
        expectTypeOf<PluginArgs<typeof TestPlugin>>().toEqualTypeOf<[tag: string]>();

        const { host } = makeHost();
        // @ts-expect-error the tag arg is a string, a number must not type-check
        host.attach('db', TestPlugin, 42);
    });

    it('a second live host throws and releases its own handlers', () => {
        const base = process.listenerCount('SIGTERM');
        makeHost();

        expect(() => makeHost()).toThrow(SeedcordError);
        expect(process.listenerCount('SIGTERM')).toBe(base + 1);
    });

    it('reset allows a fresh host', () => {
        const base = process.listenerCount('SIGTERM');
        makeHost();

        TestHost.resetHost();
        expect(process.listenerCount('SIGTERM')).toBe(base);
        expect(() => makeHost()).not.toThrow();
    });
});

describe('Pluggable shutdown during startup', () => {
    afterEach(() => {
        TestHost.resetHost();
        vi.restoreAllMocks();
    });

    it('disposes a plugin that finishes init while a shutdown waits', async () => {
        const initGate: PromiseWithResolvers<void> = Promise.withResolvers();

        class SlowInit extends TestPlugin {
            public override async init(): Promise<void> {
                await initGate.promise;
                this.initCalls++;
            }
        }

        const { host, shutdown } = makeHost();
        const plugin = host.attach('db', SlowInit, 'db').db;
        const disposed = vi.fn();
        plugin.onDispose = disposed;

        const started = host.run();
        const shuttingDown = shutdown.run(0, false);

        await delay(5);
        initGate.resolve();

        await started;
        await shuttingDown;

        expect(disposed).toHaveBeenCalledTimes(1);
    });

    it('completes a failed-start shutdown without deadlocking on the gate', async () => {
        class FailInit extends TestPlugin {
            public override init(): Promise<void> {
                return Promise.reject(new Error('init boom'));
            }
        }

        const { host, shutdown } = makeHost();
        host.attach('db', FailInit, 'db');

        await expect(host.run()).rejects.toThrow();
        await expect(shutdown.run(1, false)).resolves.toBeUndefined();
    });
});
