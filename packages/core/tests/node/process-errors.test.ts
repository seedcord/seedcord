import { REST } from '@discordjs/rest';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '#node/Pluggable';
import { StartupPhase } from '#src/lifecycle/phases';
import { Bus } from '#subscribers/Bus';

import type { SubscriptionData } from '#subscribers/types/Subscriptions';
import type { Config, IRateLimiter } from '@seedcord/types';

class TestHost extends Pluggable<'gateway', 'server'> {
    public readonly config: Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup, config: Config) {
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

// justified: this startup path reads config.errors and nothing else on Config
async function startHost(config: Config = {} as Config): Promise<{
    host: TestHost;
    shutdown: CoordinatedShutdown;
    reported: SubscriptionData<'unknownException'>[];
}> {
    const shutdown = new CoordinatedShutdown();
    const host = new TestHost(shutdown, new CoordinatedStartup(), config);
    const reported: SubscriptionData<'unknownException'>[] = [];
    host.bus.on('unknownException', (payload) => reported.push(payload));

    await host.run();
    return { host, shutdown, reported };
}

function fireLatest(event: 'uncaughtException' | 'unhandledRejection', error: Error): void {
    const latest = process.listeners(event).at(-1);
    if (!latest) throw new Error(`no ${event} listener registered`);
    // justified: both node signatures take the thrown value first
    (latest as unknown as (thrown: unknown) => void)(error);
}

describe('process error handlers', () => {
    afterEach(() => {
        TestHost.resetHost();
        vi.restoreAllMocks();
    });

    it('reports an unhandled rejection and keeps the bot running', async () => {
        const { shutdown, reported } = await startHost();
        const run = vi.spyOn(shutdown, 'run');
        const thrown = new Error('forgot an await');

        fireLatest('unhandledRejection', thrown);

        await vi.waitFor(() => {
            expect(reported).toHaveLength(1);
        });
        expect(reported[0]?.error).toBe(thrown);
        expect(reported[0]?.routeId).toBe('process:unhandledRejection');
        expect(run).not.toHaveBeenCalled();
    });

    it('reports an uncaught exception and shuts down with exit code 1', async () => {
        const { shutdown, reported } = await startHost();
        const run = vi.spyOn(shutdown, 'run').mockResolvedValue();
        const thrown = new Error('escaped every handler');

        fireLatest('uncaughtException', thrown);

        await vi.waitFor(() => {
            expect(reported).toHaveLength(1);
        });
        expect(reported[0]?.error).toBe(thrown);
        expect(reported[0]?.routeId).toBe('process:uncaughtException');
        expect(run).toHaveBeenCalledWith(1);
    });

    it('registers neither listener when catchProcessErrors is off', async () => {
        const rejections = process.listenerCount('unhandledRejection');
        const exceptions = process.listenerCount('uncaughtException');

        await startHost({ errors: { catchProcessErrors: false } } as unknown as Config);

        expect(process.listenerCount('unhandledRejection')).toBe(rejections);
        expect(process.listenerCount('uncaughtException')).toBe(exceptions);
    });

    it('removes both listeners after a failed startup', async () => {
        const exceptions = process.listenerCount('uncaughtException');
        const rejections = process.listenerCount('unhandledRejection');

        const host = new TestHost(new CoordinatedShutdown(), new CoordinatedStartup(), {} as Config);
        host.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boot failed')));
        await expect(host.run()).rejects.toThrow();
        expect(process.listenerCount('uncaughtException')).toBe(exceptions + 1);

        TestHost.resetHost();

        expect(process.listenerCount('uncaughtException')).toBe(exceptions);
        expect(process.listenerCount('unhandledRejection')).toBe(rejections);
    });

    it('removes both listeners when the host resets', async () => {
        const exceptions = process.listenerCount('uncaughtException');
        const rejections = process.listenerCount('unhandledRejection');
        await startHost();
        expect(process.listenerCount('uncaughtException')).toBe(exceptions + 1);

        TestHost.resetHost();

        expect(process.listenerCount('uncaughtException')).toBe(exceptions);
        expect(process.listenerCount('unhandledRejection')).toBe(rejections);
    });
});
