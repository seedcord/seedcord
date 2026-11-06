import {
    Commands,
    ContextMenus,
    InteractionKind,
    MemoryDriver,
    StartupPhase,
    Subscribe,
    Subscriber
} from '@seedcord/core';
import { PublishDefault, storeInteractionRoute } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { Seedcord } from '#src/edge/Seedcord';
import { Emojis } from '#src/emojis/EmojiInjector';
import { clearBakedIds, registerBakedIds } from '#tests/helpers/bakedIds';
import { BUILT_ROOT, clearBuiltFiles, registerBuiltFiles } from '#tests/helpers/builtFiles';
import { createSigner, signedRequest } from '#tests/helpers/ed25519';
import { APP_ID, VALID_TOKEN } from '#tests/helpers/fixtures';
import { capturingCtx, slashPayload } from '#tests/helpers/interactions';

import type { HttpEdgeConfig } from '#interfaces/Config';
import type { Signer } from '#tests/helpers/ed25519';
import type { CapturedCtx } from '#tests/helpers/interactions';
import type { CommandInfo, ContextMenuInfo, CoreBase, ResolvedEmoji } from '@seedcord/core';
import type { BakedIds } from '@seedcord/core/internal';

// justified: the generated registries are empty in tests
const commands = Commands as Record<string, CommandInfo>;
const userMenus = ContextMenus.user as Record<string, ContextMenuInfo>;
const emojis = Emojis as Record<string, ResolvedEmoji>;

const ping = '{"type":1}';
// a type resolve() does not recognize. the engine still publishes anyInteraction for it
const unrouted = '{"type":99}';

class Late extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class ServerOnly extends Plugin<{ runtime: 'server' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'server' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

interface Folders {
    handlers?: string;
    subscribers?: string;
}

function config(folders: Folders = {}): HttpEdgeConfig {
    return {
        bot: { interactions: { path: folders.handlers ?? null }, commands: { path: null } },
        subscribers: { path: folders.subscribers ?? null }
    };
}

function settledWithin(ctx: CapturedCtx): Promise<string> {
    const stillWaiting = new Promise<string>((resolve) => setTimeout(() => resolve('still waiting'), 0));
    return Promise.race([ctx.settled().then(() => 'finished'), stillWaiting]);
}

async function signedEnv(ids: Partial<BakedIds> = {}): Promise<Signer> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));
    registerBakedIds({ ...ids, publicKey: signer.publicKeyHex });
    return signer;
}

describe('the edge Seedcord', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
        clearBuiltFiles();
        clearBakedIds();
        LoggerChannelRegistry.instance.reset();
    });

    it('fills Commands, ContextMenus, and Emojis from the ids seedcord build wrote', async () => {
        const signer = await signedEnv({
            commands: { ping: { mention: '</ping:7>', id: '7', route: 'ping', description: 'Replies with pong' } },
            contextMenus: { user: { Profile: { id: '8', name: 'Profile', kind: 2 } }, message: {} },
            emojis: { Wave: { name: 'wave', id: '55', animated: false } }
        });

        await new Seedcord(config()).fetch(await signedRequest(signer, ping), undefined, capturingCtx());

        expect(commands.ping?.mention).toBe('</ping:7>');
        expect(userMenus.Profile?.id).toBe('8');
        expect(String(emojis.Wave)).toBe('<:wave:55>');
    });

    it('runs a slash handler from the built files', async () => {
        const ran: string[] = [];
        class Ping extends SlashHandler<never> {
            public execute(): Promise<void> {
                ran.push('ping');
                return Promise.resolve();
            }
        }
        storeInteractionRoute(InteractionKind.Slash, 'ping', Ping);
        registerBuiltFiles({ '/handlers/Ping.ts': { Ping } });
        const signer = await signedEnv();
        const ctx = capturingCtx();

        const seedcord = new Seedcord(config({ handlers: `${BUILT_ROOT}/handlers` }));
        const response = await seedcord.fetch(
            await signedRequest(signer, JSON.stringify(slashPayload('ping'))),
            undefined,
            ctx
        );
        await ctx.settled();

        expect(response.status).toBe(202);
        expect(ran).toEqual(['ping']);
    });

    it('answers a GET with 405 before reading env or starting plugins', async () => {
        const calls: string[] = [];
        class Recorder extends Plugin {
            public init(): Promise<void> {
                calls.push('init');
                return Promise.resolve();
            }
        }
        Envapter.useSource(new PortableSource({}));
        const seedcord = new Seedcord(config()).attach('recorder', Recorder);

        const response = await seedcord.fetch(new Request('https://bot.example.com/'), undefined, capturingCtx());

        expect(response.status).toBe(405);
        expect(response.headers.get('allow')).toBe('POST');
        expect(calls).toEqual([]);
    });

    it("applies config.logger when it starts, and leaves the process's logger alone before that", async () => {
        const signer = await signedEnv();
        const written: string[] = [];
        // what seedcord dev's codegen copy shares with the CLI
        LoggerChannelRegistry.instance.configure({
            level: 'info',
            sinks: [{ kind: 'file', onLog: (record) => written.push(record.message) }]
        });
        const seedcord = new Seedcord({ ...config(), logger: { level: 'warn' } });

        new Logger('Cli').info('after construction');
        await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());
        new Logger('Cli').info('after start');

        expect(written).toContain('after construction');
        expect(written).not.toContain('after start');
    });

    it('answers a signed PING with a PONG', async () => {
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());

        const response = await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ type: 1 });
    });

    it('runs each plugin init() then ready() once across concurrent first requests', async () => {
        const calls: string[] = [];
        class Counter extends Plugin {
            public init(): Promise<void> {
                calls.push('init');
                return Promise.resolve();
            }
            public override ready(): Promise<void> {
                calls.push('ready');
                return Promise.resolve();
            }
        }
        const signer = await signedEnv();
        const seedcord = new Seedcord(config()).attach('counter', Counter);

        await Promise.all([
            seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx()),
            seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx())
        ]);

        expect(calls).toEqual(['init', 'ready']);
    });

    it('runs a startup task on the first request, before plugins in a later phase', async () => {
        const calls: string[] = [];
        class Warm extends Plugin {
            constructor(host: CoreBase) {
                super(host, { init: { phase: StartupPhase.Ready } });
            }
            public init(): Promise<void> {
                calls.push('plugin init');
                return Promise.resolve();
            }
        }
        const signer = await signedEnv();
        const seedcord = new Seedcord(config()).attach('warm', Warm);
        seedcord.startup.addTask(StartupPhase.Configuration, 'warm-cache', () => {
            calls.push('startup task');
            return Promise.resolve();
        });

        expect(calls).toEqual([]);
        await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());

        expect(calls).toEqual(['startup task', 'plugin init']);
    });

    it('rolls back a failed plugin start and retries it on the next request', async () => {
        const calls: string[] = [];
        let down = true;
        class Database extends Plugin {
            public init(): Promise<void> {
                calls.push('database init');
                return Promise.resolve();
            }
            public override dispose(): Promise<void> {
                calls.push('database dispose');
                return Promise.resolve();
            }
        }
        class Cache extends Plugin {
            public init(): Promise<void> {
                calls.push('cache init');
                if (!down) return Promise.resolve();
                down = false;
                return Promise.reject(new Error('cache is down'));
            }
        }
        const signer = await signedEnv();
        const seedcord = new Seedcord(config()).attach('database', Database).attach('cache', Cache);

        await expect(seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx())).rejects.toThrow();
        const retried = await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());

        expect(retried.status).toBe(200);
        expect(calls).toEqual(['database init', 'cache init', 'database dispose', 'database init', 'cache init']);
    });

    it('runs a subscriber from the built files', async () => {
        const seen: string[] = [];
        @Subscribe(['anyInteraction'])
        class Seen extends Subscriber<'anyInteraction', CoreBase> {
            public execute(): Promise<void> {
                seen.push(String(this.data.interaction.type));
                return Promise.resolve();
            }
        }
        registerBuiltFiles({ '/subscribers/Seen.ts': { Seen } });
        const signer = await signedEnv();

        const seedcord = new Seedcord(config({ subscribers: `${BUILT_ROOT}/subscribers` }));
        await seedcord.fetch(await signedRequest(signer, unrouted), undefined, capturingCtx());

        await vi.waitFor(() => {
            expect(seen).toEqual(['99']);
        });
    });

    it("holds each request's waitUntil open for its own subscribers only", async () => {
        const release = Promise.withResolvers<undefined>();
        let runs = 0;
        @Subscribe(['anyInteraction'])
        class FirstRunStuck extends Subscriber<'anyInteraction', CoreBase> {
            public async execute(): Promise<void> {
                runs += 1;
                if (runs === 1) await release.promise;
            }
        }
        registerBuiltFiles({ '/subscribers/FirstRunStuck.ts': { FirstRunStuck } });
        const signer = await signedEnv();
        const seedcord = new Seedcord(config({ subscribers: `${BUILT_ROOT}/subscribers` }));
        const stuck = capturingCtx();
        const free = capturingCtx();

        await seedcord.fetch(await signedRequest(signer, '{"type":99,"id":"stuck"}'), undefined, stuck);
        await seedcord.fetch(await signedRequest(signer, '{"type":99,"id":"free"}'), undefined, free);

        expect(await settledWithin(free)).toBe('finished');
        expect(await settledWithin(stuck)).toBe('still waiting');

        release.resolve(undefined);
        await stuck.settled();
    });

    it('holds waitUntil open for an async bus.on listener', async () => {
        const release = Promise.withResolvers<undefined>();
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());
        seedcord.bus.on('anyInteraction', () => release.promise);
        const ctx = capturingCtx();

        await seedcord.fetch(await signedRequest(signer, unrouted), undefined, ctx);

        expect(await settledWithin(ctx)).toBe('still waiting');
        release.resolve(undefined);
        await ctx.settled();
    });

    it('holds waitUntil open for an async log sink', async () => {
        const release = Promise.withResolvers<undefined>();
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());
        using _sink = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: () => release.promise });
        seedcord.bus.on('anyInteraction', () => new Logger('Spike').info('logged'));
        const ctx = capturingCtx();

        await seedcord.fetch(await signedRequest(signer, unrouted), undefined, ctx);

        expect(await settledWithin(ctx)).toBe('still waiting');
        release.resolve(undefined);
        await ctx.settled();
    });

    it('holds the first request open while startup runs', async () => {
        const release = Promise.withResolvers<undefined>();
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());
        seedcord.startup.addTask(StartupPhase.Configuration, 'slow', () => release.promise);
        const ctx = capturingCtx();

        const answered = seedcord.fetch(await signedRequest(signer, unrouted), undefined, ctx);

        expect(await settledWithin(ctx)).toBe('still waiting');
        release.resolve(undefined);
        await answered;
        await ctx.settled();
    });

    it('holds waitUntil open for a subscriber that a startup task published to', async () => {
        const release = Promise.withResolvers<undefined>();
        @Subscribe(['anyInteraction'])
        class StuckAtStartup extends Subscriber<'anyInteraction', CoreBase> {
            public async execute(): Promise<void> {
                if (this.data.interaction.id === 'startup') await release.promise;
            }
        }
        registerBuiltFiles({ '/subscribers/StuckAtStartup.ts': { StuckAtStartup } });
        const signer = await signedEnv();
        const seedcord = new Seedcord(config({ subscribers: `${BUILT_ROOT}/subscribers` }));
        seedcord.startup.addTask(StartupPhase.Configuration, 'publishes', () => {
            // justified: the subscriber reads only the id
            seedcord.bus[PublishDefault]('anyInteraction', { interaction: { id: 'startup' } as never });
            return Promise.resolve();
        });
        const ctx = capturingCtx();

        await seedcord.fetch(await signedRequest(signer, unrouted), undefined, ctx);

        expect(await settledWithin(ctx)).toBe('still waiting');
        release.resolve(undefined);
        await ctx.settled();
    });

    it('refuses a plugin attached after the first request started it', async () => {
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());
        await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());

        expect(() => seedcord.attach('late', Late)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginAfterInit })
        );
    });

    it('rejects a server-only plugin', () => {
        const seedcord = new Seedcord(config());

        // @ts-expect-error ServerOnly declares runtime 'server'
        expect(() => seedcord.attach('server', ServerOnly)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginScopeMismatch })
        );
    });

    it('backs core.kv with config.kv', () => {
        const driver = new MemoryDriver();
        const seedcord = new Seedcord({ ...config(), kv: driver });

        expect(seedcord.kv.driver).toBe(driver);
    });

    it('resolves the application id from the token on the first request', async () => {
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());

        expect(() => seedcord.applicationId).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreApplicationUnavailable })
        );
        await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());

        expect(seedcord.applicationId).toBe(APP_ID);
    });

    it('allows one Seedcord per isolate', () => {
        expect(() => new Seedcord(config())).not.toThrow();
        expect(() => new Seedcord(config())).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreSingletonViolation })
        );
    });

    describe('after a plugin init times out', () => {
        const calls: string[] = [];
        let hung = Promise.withResolvers<undefined>();
        let retryInit: Promise<unknown> = Promise.resolve();
        let retryStarted = Promise.withResolvers<undefined>();
        let first = true;
        class Slow extends Plugin {
            constructor(host: CoreBase) {
                super(host, { init: { timeout: 20 } });
            }
            public async init(): Promise<void> {
                calls.push('init');
                if (!first) {
                    retryStarted.resolve(undefined);
                    await retryInit;
                    return;
                }
                first = false;
                await hung.promise;
            }
            public override dispose(): Promise<void> {
                calls.push('dispose');
                return Promise.resolve();
            }
        }

        afterEach(() => {
            calls.length = 0;
            hung = Promise.withResolvers<undefined>();
            retryInit = Promise.resolve();
            retryStarted = Promise.withResolvers<undefined>();
            first = true;
            vi.useRealTimers();
        });

        it('waits for the old init to finish and dispose before it retries', async () => {
            const signer = await signedEnv();
            const seedcord = new Seedcord(config()).attach('slow', Slow);
            const failed = capturingCtx();

            await expect(seedcord.fetch(await signedRequest(signer, ping), undefined, failed)).rejects.toThrow();
            await expect(
                seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx())
            ).rejects.toThrow();
            hung.resolve(undefined);
            await failed.settled();
            const retried = await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());

            expect(retried.status).toBe(200);
            expect(calls).toEqual(['init', 'dispose', 'init']);
        });

        it('retries 25s after the timeout, and the old init finishing late leaves the retry alone', async () => {
            const signer = await signedEnv();
            const seedcord = new Seedcord(config()).attach('slow', Slow);
            const failed = capturingCtx();
            const holdRetry = Promise.withResolvers<undefined>();
            retryInit = holdRetry.promise;
            const firstRequest = await signedRequest(signer, ping);
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });

            const rejected = expect(seedcord.fetch(firstRequest, undefined, failed)).rejects.toThrow();
            await vi.advanceTimersByTimeAsync(20);
            await rejected;
            await vi.advanceTimersByTimeAsync(25_000);
            await failed.settled();
            vi.useRealTimers();
            const retrying = seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());
            await retryStarted.promise;
            hung.resolve(undefined);
            await new Promise((resolve) => setTimeout(resolve, 0));
            holdRetry.resolve(undefined);
            const retried = await retrying;

            expect(retried.status).toBe(200);
            expect(calls).toEqual(['init', 'init']);
        });
    });

    it('refuses a plugin attached while startup runs', async () => {
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());
        let caught: unknown;
        seedcord.startup.addTask(StartupPhase.Configuration, 'attach-late', () => {
            try {
                seedcord.attach('late', Late);
            } catch (error) {
                caught = error;
            }
            return Promise.resolve();
        });

        await seedcord.fetch(await signedRequest(signer, ping), undefined, capturingCtx());

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CorePluginAfterInit });
    });

    it('reads no env until the first request', async () => {
        Envapter.useSource(new PortableSource({}));
        registerBakedIds({ publicKey: 'ab'.repeat(32) });

        const seedcord = new Seedcord(config());

        await expect(
            seedcord.fetch(new Request('https://bot.example', { method: 'POST' }), undefined, capturingCtx())
        ).rejects.toThrow(expect.objectContaining({ code: SeedcordErrorCode.ConfigMissingEnv }));
    });

    it('rethrows a failed first request on every later one', async () => {
        Envapter.useSource(new PortableSource({}));
        const seedcord = new Seedcord(config());
        const first = await seedcord
            .fetch(new Request('https://bot.example', { method: 'POST' }), undefined, capturingCtx())
            .catch((caught: unknown) => caught);

        const signer = await signedEnv();
        const second = await seedcord
            .fetch(await signedRequest(signer, ping), undefined, capturingCtx())
            .catch((caught: unknown) => caught);

        expect(second).toBe(first);
    });
});
