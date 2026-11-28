import { setTimeout as sleep } from 'node:timers/promises';

import { ShutdownPhase, shutdownOf, StartupPhase } from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { HostShutdown, HostStartup } from '@seedcord/types/internal';
import { Events } from 'discord.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test';

import { Plugin } from '#src/Plugin';
import { Seedcord } from '#src/Seedcord';

import { readyOnLogin } from './utils/readyOnLogin';
import { testConfig } from './utils/test-config';

import type { ILogSink } from '@seedcord/types';
import type { Client } from 'discord.js';

// port 0 has node pick a free port
const ANY_PORT = { port: 0 } as const;
// a shutdown with nothing to wait for finishes well inside this
const STILL_OPEN_MS = 300;

class Page extends Plugin {
    public override fetch(request: Request): Response | undefined {
        return new URL(request.url).pathname === '/page' ? new Response('page') : undefined;
    }
}

function get(seedcord: Seedcord, path: string): Promise<Response> {
    return fetch(`http://127.0.0.1:${String(seedcord.port)}${path}`);
}

function reset(): void {
    // @ts-expect-error reset the Seedcord singleton between tests
    Seedcord.reset();
}

describe('Seedcord host', () => {
    beforeEach(reset);
    afterEach(reset);

    it("doesn't install signal handlers while only constructed", () => {
        const base = [process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')];

        // eslint-disable-next-line no-new -- construction is the behavior under test
        new Seedcord(testConfig());

        expect([process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')]).toEqual(base);
    });

    it('attaches under a key that type-checks even when the host keeps a field of that name', () => {
        class Probe extends Plugin {}

        const seedcord = new Seedcord(testConfig()).attach('hmrManager', Probe);

        expect(seedcord.hmrManager).toBeInstanceOf(Probe);
    });

    it('exposes the discord.js client REST as core.rest', () => {
        const seedcord = new Seedcord(testConfig());

        expect(seedcord.rest).toBe(seedcord.bot.client.rest);
    });

    it("serves a plugin's route on its server and answers 404 to any other path", async () => {
        await using seedcord = new Seedcord(testConfig({ server: ANY_PORT })).attach('page', Page);
        readyOnLogin(seedcord);
        await seedcord.start();

        const page = await get(seedcord, '/page');
        const other = await get(seedcord, '/other');

        expect([await page.text(), other.status]).toEqual(['page', 404]);
    });

    it('holds a shutdown open for a log sink that a plugin route started', async () => {
        const routeLog = 'answered from the route';
        class Logs extends Plugin {
            public override fetch(): Response {
                this.logger.info(routeLog);
                return new Response('logged');
            }
        }
        const release = Promise.withResolvers<undefined>();
        await using seedcord = new Seedcord(testConfig()).attach('logs', Logs);
        readyOnLogin(seedcord);
        await seedcord.start();
        using _sink = LoggerChannelRegistry.instance.installSink({
            kind: 'capture',
            onLog: ({ message }) => (message === routeLog ? release.promise : undefined)
        });

        await seedcord.fetch(new Request('http://bot.test/page'));
        const closing = shutdownOf(seedcord)
            .run(0, false)
            .then(() => 'closed');
        const whileSinkRuns = await Promise.race([closing, sleep(STILL_OPEN_MS).then(() => 'still open')]);
        release.resolve(undefined);

        expect([whileSinkRuns, await closing]).toEqual(['still open', 'closed']);
    });

    it("doesn't open a server with health: false unless a plugin has fetch", async () => {
        await using seedcord = new Seedcord(testConfig({ server: { ...ANY_PORT, health: false } }));
        readyOnLogin(seedcord);
        await seedcord.start();

        expect(seedcord.port).toBeUndefined();
    });

    it('rejects a restart after a failed start', async () => {
        const seedcord = new Seedcord(testConfig());
        seedcord.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boom')));

        await expect(seedcord.start()).rejects.toThrow();
        await expect(seedcord.start()).rejects.toThrow(/new instance/);
        expect(() => new Seedcord(testConfig())).not.toThrow();
    });

    it("a stale host retrying start doesn't replace the live host", async () => {
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

    it('disposes a plugin whose init() finishes after startup was aborted', async () => {
        const { promise: initStarted, resolve: markInitStarted } = Promise.withResolvers<undefined>();
        const { promise: initGate, resolve: finishInit } = Promise.withResolvers<undefined>();
        const dispose = vi.fn(() => Promise.resolve());
        class SlowConnect extends Plugin {
            public override async init(): Promise<void> {
                markInitStarted(undefined);
                await initGate;
            }

            public override dispose = dispose;
        }
        const seedcord = new Seedcord(testConfig()).attach('db', SlowConnect);

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

    it('fails the start right away when discord rejects the login', async () => {
        const seedcord = new Seedcord(testConfig());
        const { client } = seedcord.bot;
        vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
        // what discord.js rejects with after a 4014 close
        vi.spyOn(client, 'login').mockRejectedValue(new Error('Used disallowed intents'));
        vi.spyOn(client, 'destroy').mockResolvedValue(undefined);

        const error: unknown = await seedcord.start().catch((caught: unknown) => caught);

        expect(error).toMatchObject({ errors: [{ message: 'Used disallowed intents' }] });
        vi.restoreAllMocks();
    });
});
