import { ShutdownPhase, StartupPhase } from '@seedcord/core/node/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import { testConfig } from './utils/test-config';

import './utils/mock-env';

function reset(): void {
    // @ts-expect-error reset the Seedcord singleton between tests
    Seedcord.reset();
}

describe('Seedcord host', () => {
    beforeEach(reset);
    afterEach(reset);

    it('reset() releases the signal handlers', () => {
        const base = process.listenerCount('SIGTERM');

        // eslint-disable-next-line no-new -- construction registers the handlers under test
        new Seedcord(testConfig());
        expect(process.listenerCount('SIGTERM')).toBe(base + 1);

        reset();
        expect(process.listenerCount('SIGTERM')).toBe(base);
    });

    it('exposes the discord.js client REST as core.rest', () => {
        const seedcord = new Seedcord(testConfig());

        expect(seedcord.rest).toBe(seedcord.bot.client.rest);
    });

    it('registers the health server by default', () => {
        const seedcord = new Seedcord(testConfig());

        expect(seedcord.shutdown.removeTask(ShutdownPhase.Drain, 'stop-healthcheck-server')).toBe(true);
    });

    it('healthCheck: false skips the health server', () => {
        const seedcord = new Seedcord(testConfig({ healthCheck: false }));

        expect(seedcord.shutdown.removeTask(ShutdownPhase.Drain, 'stop-healthcheck-server')).toBe(false);
    });

    it('rejects a restart after a failed start', async () => {
        const seedcord = new Seedcord(testConfig());
        seedcord.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boom')));

        await expect(seedcord.start()).rejects.toThrow();
        await expect(seedcord.start()).rejects.toThrow(/new instance/);
        expect(() => new Seedcord(testConfig())).not.toThrow();
    });

    it('a stale host retrying start leaves the live host alone', async () => {
        const dead = new Seedcord(testConfig());
        dead.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boom')));
        await expect(dead.start()).rejects.toThrow();

        const base = process.listenerCount('SIGTERM');
        // eslint-disable-next-line no-new -- construction registers the handlers under test
        new Seedcord(testConfig());
        expect(process.listenerCount('SIGTERM')).toBe(base + 1);

        await expect(dead.start()).rejects.toThrow(/new instance/);

        expect(process.listenerCount('SIGTERM')).toBe(base + 1);
    });

    it('a racing start failure tears the host down once', async () => {
        const seedcord = new Seedcord(testConfig());
        seedcord.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boom')));
        seedcord.shutdown.addTask(
            ShutdownPhase.Drain,
            'slow',
            () => new Promise<void>((resolve) => setTimeout(resolve, 50))
        );
        const configure = vi.spyOn(LoggerChannelRegistry.instance, 'configure');

        const settled = await Promise.allSettled([seedcord.start(), seedcord.start()]);

        expect(settled.map((result) => result.status)).toEqual(['rejected', 'rejected']);
        expect(configure).toHaveBeenCalledTimes(1);
    });

    it('a start failure after login destroys the client', async () => {
        const seedcord = new Seedcord(testConfig());
        // justified: the mock client cannot complete a real login handshake
        vi.spyOn(seedcord.bot, 'init').mockResolvedValue(undefined);
        const destroySpy = vi.spyOn(seedcord.bot.client, 'destroy').mockResolvedValue(undefined);
        seedcord.startup.addTask(StartupPhase.Ready, 'boom', () => Promise.reject(new Error('boom')));

        await expect(seedcord.start()).rejects.toThrow();

        expect(destroySpy).toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});
