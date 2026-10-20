import { once } from 'node:events';
import { createServer } from 'node:http';

import { bindBotColor, busLoggerOf, connectDevChannel, getDevChannel, HmrManager } from '@seedcord/core/internal';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';
import { DRAIN_TASK_TIMEOUT_MS, ShutdownPhase, StartupPhase } from '@seedcord/core/node/internal';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { HostAugmentTarget, HostListenHost, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { isPortInUse } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';

import { HttpStartupTasks } from '#src/HttpStartupTasks';
import { InteractionsService } from '#src/InteractionsService';
import { usernameOf } from '#src/username';
import { version as packageVersion } from '#src/version';

import { NodeEndpoint } from './NodeEndpoint';
import { toWebRequest, writeWebResponse } from './webBridge';

import type { HttpServerConfig } from '#interfaces/Config';
import type { REST } from '@discordjs/rest';
import type { Bus } from '@seedcord/core';
import type { IRateLimiter } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const DEFAULT_PORT = 3000;
const SERVER_SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * The HTTP-interactions bot on node. `start()` loads handlers from `config.bot.interactions.path`
 * and binds a server on `port`. With `port: false`, your own server passes requests to `fetch()`.
 *
 * Shutdown waits up to 5s for interactions that are still running.
 */
// tests/node/seedcord-core.types-test.ts checks this class against Core in place of an implements clause
export class Seedcord extends ServerHost<'http'> implements SeedcordInstance {
    // the CLI reads these to detect and augment the instance
    /** @internal */
    public readonly [SeedcordBrand] = true;
    /** @internal */
    public readonly [HostAugmentTarget] = '@seedcord/http';
    /** @internal */
    public readonly [HostVersion]: string = packageVersion;
    /** @internal */
    public [HostListenHost]?: string | undefined;

    /** Discord REST client built from `bot.restOptions`. `start()` sets the token. */
    public readonly rest: REST;

    /** @see {@link IRateLimiter} */
    public readonly rateLimiter: IRateLimiter;

    /** @see {@link Bus} */
    public readonly bus: Bus;

    readonly #service: InteractionsService;
    readonly #endpoint: NodeEndpoint;
    readonly #hmrManager: HmrManager;
    readonly #logger = new Logger('Server', { channel: 'bot' });

    #server?: Server;
    #boundPort?: number;
    #fetchedUsername?: string | undefined;

    public readonly config: HttpServerConfig;

    /**
     * @throws A **SeedcordError** when another `Seedcord` exists in this process and has not shut down.
     * @throws A **SeedcordError** when the running Node or Bun is older than the range in `engines`.
     */
    constructor(config: HttpServerConfig) {
        super('http', new CoordinatedShutdown(config.lifecycle?.shutdownDeadline), new CoordinatedStartup());
        this.config = config;

        installNodeDefaults(config.logger);
        bindBotColor(() => this.config.botColor);

        this.#service = new InteractionsService(this, config, config.bot.restOptions);
        this.rest = this.#service.rest;
        this.rateLimiter = this.#service.rateLimiter;
        this.bus = this.#service.bus;
        this.#endpoint = new NodeEndpoint(this.#service, this.#logger);

        this.#hmrManager = new HmrManager();
        this.#hmrManager.init(connectDevChannel());

        this.#registerStartupTasks();
        this.#registerShutdownTasks();
    }

    /** The bot's discord username, populated by the ready fetch. */
    public get username(): string | undefined {
        return this.#fetchedUsername;
    }

    /** The bound server port, set once `start()` is listening. Stays `undefined` with `port: false`. */
    public get port(): number | undefined {
        return this.#boundPort;
    }

    /**
     * Starts the host and runs the startup tasks.
     */
    public start(): Promise<this> {
        const starting = this.init();
        this.#endpoint.startWith(starting);
        return starting;
    }

    /**
     * Answers one request to the interactions endpoint. Mount it in your own server when the
     * config sets `port: false`.
     *
     * Rejects with `CoreFetchBeforeStart` until `start()` is called. A request that arrives while
     * `start()` runs waits for all of startup, the command deploy included. Answers 503 once
     * shutdown begins or `start()` fails.
     *
     * @example
     * ```ts
     * // Hono passes the untouched request through c.req.raw
     * const seedcord = new Seedcord({ ...config, port: false });
     * await seedcord.start();
     *
     * const app = new Hono();
     * app.post('/interactions', (c) => seedcord.fetch(c.req.raw));
     * ```
     */
    public fetch(request: Request): Promise<Response> {
        return this.#endpoint.fetch(request);
    }

    #registerStartupTasks(): void {
        const tasks = new HttpStartupTasks(this, this.#service);
        if (Envapter.isDevelopment || Envapter.isTest) tasks.registerHmr(this.#hmrManager);

        this.startup.addTask(StartupPhase.Configuration, 'bus-initialization', async () => {
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'start');
            await this.#service.subscribers.init();
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'end');
        });

        const interactions = this.#service.interactions;
        if (interactions) {
            this.startup.addTask(StartupPhase.Configuration, 'interactions-initialization', async () => {
                interactions.logger.utils.initialization('Interactions', 'start');
                await interactions.init();
                interactions.logger.utils.initialization('Interactions', 'end');
            });
        }

        this.startup.addTask(StartupPhase.Configuration, 'authenticate', () => {
            this.#service.authenticate();
            return Promise.resolve();
        });

        // the Login tasks read the token authenticate sets
        tasks.addDiscordTasks();

        this.startup.addTask(StartupPhase.Ready, 'http-server', () => {
            const { port = DEFAULT_PORT } = this.config;
            return port === false ? Promise.resolve() : this.#listen(port);
        });

        if (!Envapter.isTest) {
            this.startup.addTask(StartupPhase.Ready, 'identity', () => this.#fetchUsername());
        }
    }

    #registerShutdownTasks(): void {
        this.shutdown.addTask(ShutdownPhase.Unbind, 'close-endpoint', () => {
            this.#endpoint.close();
            return Promise.resolve();
        });
        this.shutdown.addTask(
            ShutdownPhase.Drain,
            'drain-inflight',
            () => this.#endpoint.drain(),
            DRAIN_TASK_TIMEOUT_MS
        );
    }

    /** The bot's Discord application id. Throws if you read it before the Configuration phase. */
    public get applicationId(): string {
        return this.#service.applicationId;
    }

    async #listen(port: number): Promise<void> {
        const server = createServer((incoming, outgoing) => {
            void (async () => {
                const response = await this.#endpoint.answer(await toWebRequest(incoming));
                // node's close() leaves a busy connection open once it goes idle
                if (!server.listening) outgoing.setHeader('connection', 'close');
                await writeWebResponse(response, outgoing);
            })().catch((error: unknown) => {
                // a swallowed throw would hang the client with no cause
                outgoing.destroy(Error.isError(error) ? error : new Error(String(error)));
            });
        });
        this.#server = server;

        server.listen(port, this[HostListenHost]);
        try {
            await once(server, 'listening');
        } catch (error: unknown) {
            if (!isPortInUse(error)) throw error;
            throw new SeedcordError(SeedcordErrorCode.PortInUse, [port, 'port'], { cause: error });
        }
        // justified: address() is AddressInfo once a TCP server is listening
        this.#boundPort = (server.address() as AddressInfo).port;
        this.#logger.info(`Interactions server listening on port ${paint.sky.bold(String(this.#boundPort))}`);
        getDevChannel()?.send('seedcord:server-listening', { port: this.#boundPort });

        this.shutdown.addTask(
            ShutdownPhase.Unbind,
            'stop-http-server',
            () => this.#stopServer(),
            SERVER_SHUTDOWN_TIMEOUT_MS
        );
    }

    async #fetchUsername(): Promise<void> {
        this.#fetchedUsername = await usernameOf(this.rest, this.#logger);
    }

    #stopServer(): Promise<void> {
        const server = this.#server;
        if (!server?.listening) return Promise.resolve();

        return new Promise((resolveClose, rejectClose) => {
            server.close((err) => {
                if (err) {
                    rejectClose(err);
                    return;
                }
                this.#logger.info(paint.coral.bold('Interactions server stopped'));
                resolveClose();
            });
        });
    }
}
