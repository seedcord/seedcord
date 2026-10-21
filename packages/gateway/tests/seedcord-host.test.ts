import { createServer } from 'node:net';

import { ShutdownPhase, shutdownOf, StartupPhase } from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { HostShutdown, HostStartup } from '@seedcord/types/internal';
import { Events } from 'discord.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Plugin } from '#src/Plugin';
import { Seedcord } from '#src/Seedcord';

import { testConfig } from './utils/test-config';

import type { ILogSink } from '@seedcord/types';
import type { Client } from 'discord.js';
import type { AddressInfo } from 'node:net';
import type { Mock } from 'vitest';

function freePort(): Promise<number> {
    const probe = createServer().listen(0, '127.0.0.1');
    return new Promise((resolve) => {
        probe.once('listening', () => {
            // justified: address() is AddressInfo once a TCP server is listening
            const { port } = probe.address() as AddressInfo;
            probe.close(() => resolve(port));
        });
    });
}

async function healthStatusWithin(port: number, ms: number): Promise<number | 'refused'> {
    const until = Date.now() + ms;
    while (Date.now() < until) {
        const status = await fetch(`http://127.0.0.1:${port}/health`).then(
            (response) => response.status,
            () => undefined
        );
        if (status !== undefined) return status;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return 'refused';
}

function reset(): void {
    // @ts-expect-error reset the Seedcord singleton between tests
    Seedcord.reset();
}

describe('Seedcord host', () => {
    beforeEach(reset);
    afterEach(reset);

    it('installs no signal handlers while only constructed', () => {
        const base = [process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')];

        // eslint-disable-next-line no-new -- construction is the behavior under test
        new Seedcord(testConfig());

        expect([process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')]).toEqual(base);
    });

    it('attaches under a key that type-checks even when the host keeps a field of that name', () => {
        class Probe extends Plugin {
            public init(): Promise<void> {
                return Promise.resolve();
            }
        }

        const seedcord = new Seedcord(testConfig()).attach('healthCheck', Probe);

        expect(seedcord.healthCheck).toBeInstanceOf(Probe);
    });

    it('exposes the discord.js client REST as core.rest', () => {
        const seedcord = new Seedcord(testConfig());

        expect(seedcord.rest).toBe(seedcord.bot.client.rest);
    });

    it('registers the health server by default', () => {
        const seedcord = new Seedcord(testConfig());

        expect(shutdownOf(seedcord).removeTask(ShutdownPhase.Drain, 'stop-healthcheck-server')).toBe(true);
    });

    it('healthCheck: false skips the health server', () => {
        const seedcord = new Seedcord(testConfig({ healthCheck: false }));

        expect(shutdownOf(seedcord).removeTask(ShutdownPhase.Drain, 'stop-healthcheck-server')).toBe(false);
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

        // eslint-disable-next-line no-new -- the live host under test
        new Seedcord(testConfig());

        await expect(dead.start()).rejects.toThrow(/new instance/);

        expect(() => new Seedcord(testConfig())).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreSingletonViolation })
        );
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
        // one install of config.logger at start, one reset at teardown
        expect(configure).toHaveBeenCalledTimes(2);
    });

    it("sends logs to config.logger's sinks once it starts, and not while only constructed", async () => {
        const seen: string[] = [];
        const sinks: ILogSink[] = [{ kind: 'console', onLog: (record) => void seen.push(record.message) }];
        const seedcord = new Seedcord({ ...testConfig(), logger: { sinks } });

        new Logger('probe').info('constructed');
        await seedcord.start().catch(() => undefined);

        expect(seen).not.toContain('constructed');
        expect(seen).not.toEqual([]);
    });

    it('answers the health path only once every plugin is ready', async () => {
        const port = await freePort();
        const { promise: readyStarted, resolve: markReadyStarted } = Promise.withResolvers<undefined>();
        const { promise: readyGate, resolve: finishReady } = Promise.withResolvers<undefined>();
        class SlowReady extends Plugin {
            public init(): Promise<void> {
                return Promise.resolve();
            }

            public override ready(): Promise<void> {
                markReadyStarted(undefined);
                return readyGate;
            }
        }
        await using seedcord = new Seedcord(testConfig({ healthCheck: { port } })).attach('slow', SlowReady);
        vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
        // the mock client never connects. login waits on ClientReady
        const client = seedcord.bot.client as unknown as { once: Mock };
        client.once.mockImplementation((event: Events, onReady: () => void) => {
            if (event === Events.ClientReady) onReady();
        });

        const starting = seedcord.start();
        await readyStarted;
        const whileReadying = await healthStatusWithin(port, 200);
        finishReady(undefined);
        await starting;

        expect([whileReadying, await healthStatusWithin(port, 1000)]).toEqual(['refused', 200]);
    });

    it('disposes a plugin whose init() finishes after startup was aborted', async () => {
        const { promise: initStarted, resolve: markInitStarted } = Promise.withResolvers<undefined>();
        const { promise: initGate, resolve: finishInit } = Promise.withResolvers<undefined>();
        const dispose = vi.fn(() => Promise.resolve());
        class SlowConnect extends Plugin {
            public async init(): Promise<void> {
                markInitStarted(undefined);
                await initGate;
            }

            public override dispose = dispose;
        }
        const seedcord = new Seedcord(testConfig({ healthCheck: false })).attach('db', SlowConnect);

        // the steps DevSession.stop takes on r or q
        const starting = seedcord.start().catch(() => undefined);
        await initStarted;
        seedcord[HostStartup].abort();
        setTimeout(() => finishInit(undefined), 20);
        await starting;
        await seedcord[HostShutdown].run(0, false);

        expect(dispose).toHaveBeenCalledOnce();
    });

    it('a start failure after login destroys the client', async () => {
        const seedcord = new Seedcord(testConfig());
        const { client } = seedcord.bot;
        // the test token never reaches a real handshake. login() waits on ClientReady
        vi.spyOn(client, 'login').mockImplementation(() => {
            client.emit(Events.ClientReady, client as Client<true>);
            return Promise.resolve('token');
        });
        const destroySpy = vi.spyOn(client, 'destroy').mockResolvedValue(undefined);
        seedcord.startup.addTask(StartupPhase.Ready, 'boom', () => Promise.reject(new Error('boom')));

        await expect(seedcord.start()).rejects.toThrow();

        expect(destroySpy).toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});
