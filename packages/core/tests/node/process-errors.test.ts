import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import { StartupPhase } from '#src/lifecycle/phases';
import { TestServerHost } from '#tests/utils/TestServerHost';

import type { SubscriptionData } from '#subscribers/types/Subscriptions';
import type { Config, LogRecord } from '@seedcord/types';

// justified: this startup path reads config.errors and nothing else on Config
async function startHost(config: Config = {} as Config): Promise<{
    host: TestServerHost;
    shutdown: CoordinatedShutdown;
    reported: SubscriptionData<'unknownException'>[];
}> {
    const shutdown = new CoordinatedShutdown();
    const host = new TestServerHost(shutdown, new CoordinatedStartup(), config);
    const reported: SubscriptionData<'unknownException'>[] = [];
    host.bus.on('unknownException', (payload) => reported.push(payload));

    await host.run();
    return { host, shutdown, reported };
}

function fireUncaught(error: Error): void {
    const latest = process.listeners('uncaughtException').at(-1);
    if (!latest) throw new Error('no uncaughtException listener registered');
    latest(error, 'uncaughtException');
}

function fireRejection(reason: Error): void {
    const latest = process.listeners('unhandledRejection').at(-1);
    if (!latest) throw new Error('no unhandledRejection listener registered');
    latest(reason, Promise.resolve());
}

describe('process error handlers', () => {
    afterEach(() => {
        TestServerHost.resetHost();
        vi.restoreAllMocks();
    });

    it('reports an unhandled rejection with its stack and keeps the bot running', async () => {
        const { shutdown, reported } = await startHost();
        const run = vi.spyOn(shutdown, 'run');
        const thrown = new Error('forgot an await');
        const logged: LogRecord[] = [];
        using _capture = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => logged.push(r) });

        fireRejection(thrown);

        await vi.waitFor(() => {
            expect(reported).toHaveLength(1);
        });
        expect(reported[0]?.error).toBe(thrown);
        expect(reported[0]?.origin).toBe('process:unhandledRejection');
        expect(logged.at(-1)?.args).toEqual([thrown]);
        expect(run).not.toHaveBeenCalled();
    });

    it('logs the message and its cause on one line with errorStack off', async () => {
        await startHost({ errors: { errorStack: false } } as unknown as Config);
        const logged: LogRecord[] = [];
        using _capture = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => logged.push(r) });

        fireRejection(new Error('sync failed', { cause: new TypeError('fetch failed\nat line 2') }));

        expect(logged.at(-1)?.message).toMatch(/ \| sync failed\ncaused by TypeError: fetch failed$/u);
    });

    it('reports an uncaught exception and shuts down with exit code 1', async () => {
        const { shutdown, reported } = await startHost();
        const run = vi.spyOn(shutdown, 'run').mockResolvedValue();
        const thrown = new Error('escaped every handler');

        fireUncaught(thrown);

        await vi.waitFor(() => {
            expect(reported).toHaveLength(1);
        });
        expect(reported[0]?.error).toBe(thrown);
        expect(reported[0]?.origin).toBe('process:uncaughtException');
        expect(run).toHaveBeenCalledWith(1);
    });

    it('registers neither listener when catchProcessErrors is off', async () => {
        const rejections = process.listenerCount('unhandledRejection');
        const exceptions = process.listenerCount('uncaughtException');

        await startHost({ errors: { catchProcessErrors: false } } as unknown as Config);

        expect(process.listenerCount('unhandledRejection')).toBe(rejections);
        expect(process.listenerCount('uncaughtException')).toBe(exceptions);
    });

    it('registers one listener pair when two starts race', async () => {
        const exceptions = process.listenerCount('uncaughtException');
        const rejections = process.listenerCount('unhandledRejection');

        const host = new TestServerHost(new CoordinatedShutdown(), new CoordinatedStartup(), {} as Config);
        await Promise.all([host.run(), host.run()]);

        expect(process.listenerCount('uncaughtException')).toBe(exceptions + 1);

        TestServerHost.resetHost();

        expect(process.listenerCount('uncaughtException')).toBe(exceptions);
        expect(process.listenerCount('unhandledRejection')).toBe(rejections);
    });

    it('a racing start sees the same startup failure', async () => {
        const host = new TestServerHost(new CoordinatedShutdown(), new CoordinatedStartup(), {} as Config);
        host.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boot failed')));

        const settled = await Promise.allSettled([host.run(), host.run()]);

        expect(settled.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    });

    it('removes both listeners after a failed startup', async () => {
        const exceptions = process.listenerCount('uncaughtException');
        const rejections = process.listenerCount('unhandledRejection');

        const host = new TestServerHost(new CoordinatedShutdown(), new CoordinatedStartup(), {} as Config);
        host.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boot failed')));
        await expect(host.run()).rejects.toThrow();

        expect(process.listenerCount('uncaughtException')).toBe(exceptions);
        expect(process.listenerCount('unhandledRejection')).toBe(rejections);
    });

    it('removes both listeners when the host resets', async () => {
        const exceptions = process.listenerCount('uncaughtException');
        const rejections = process.listenerCount('unhandledRejection');
        await startHost();
        expect(process.listenerCount('uncaughtException')).toBe(exceptions + 1);

        TestServerHost.resetHost();

        expect(process.listenerCount('uncaughtException')).toBe(exceptions);
        expect(process.listenerCount('unhandledRejection')).toBe(rejections);
    });
});
