import { once } from 'node:events';
import { createServer } from 'node:http';

import { REST } from '@discordjs/rest';
import { HmrManager, setBotColor } from '@seedcord/core/internal';
import {
    CoordinatedShutdown,
    CoordinatedStartup,
    HealthCheck,
    Pluggable,
    ShutdownPhase,
    StartupPhase
} from '@seedcord/core/node/internal';
import { validateDiscordToken } from '@seedcord/errors/internal';
import { Logger, LoggerChannelRegistry, paint } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { SeedcordBrand } from '@seedcord/types/internal';
import { Routes } from 'discord-api-types/v10';
import { Envapter } from 'envapt';

import { buildRouteMaps } from '@src/dispatch/resolve';
import { buildEngine } from '@src/engine';
import { EMPTY_MANIFEST } from '@src/manifest/RouteManifest';

import { InteractionDispatcher } from './InteractionDispatcher';
import { toWebRequest, writeWebResponse } from './webBridge';
import { version as packageVersion } from '../version';

import type { HttpConfig } from '@interfaces/Config';
import type { Core } from '@interfaces/Core';
import type { PluginCapabilities } from '@seedcord/core/node/internal';
import type { IRateLimiter } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const DEFAULT_PORT = 3000;
const SERVER_SHUTDOWN_TIMEOUT_MS = 5000;
const DRAIN_TIMEOUT_MS = 10_000;

/**
 * The HTTP-interactions bot host, a long-running node server around the engine.
 *
 * Discovers handlers from `config.bot.interactions.path`, verifies and dispatches interactions on
 * `start(port)`, and runs coordinated shutdown with an in-flight drain. The edge deploy path calls
 * `createSeedcord` from a generated entry.
 */
export class Seedcord extends Pluggable implements Core, SeedcordInstance {
    // the CLI reads these to detect and augment the instance
    /** @internal */
    public readonly [SeedcordBrand] = true;
    /** @internal */
    public readonly augmentTarget = '@seedcord/http';
    /** @internal */
    public readonly version: string = packageVersion;

    /** Workerd-compatible Discord REST client. `start()` sets the token. */
    public readonly rest = new REST();

    /** @see {@link IRateLimiter} */
    public readonly rateLimiter: IRateLimiter;

    private readonly interactions?: InteractionDispatcher;
    private readonly healthCheck?: HealthCheck | undefined;
    private readonly hmrManager: HmrManager;
    private readonly logger = new Logger('Server');

    private server?: Server;
    private boundPort?: number;
    private requestedPort = DEFAULT_PORT;
    private fetchedUsername?: string | undefined;

    constructor(public readonly config: HttpConfig) {
        super(new CoordinatedShutdown(), new CoordinatedStartup());

        installNodeDefaults(config.logger);
        setBotColor(config.botColor);

        this.hmrManager = new HmrManager();
        this.hmrManager.init();

        if (this.config.bot.interactions.path) {
            this.interactions = new InteractionDispatcher(this.config.bot.interactions.path);
        }

        this.rateLimiter = config.store ?? new MemoryRateLimiter();
        // the edge arm types healthCheck never, and a dev run of an edge config needs no health server
        this.healthCheck =
            config.runtime === 'edge' ? undefined : HealthCheck.fromOption(this.shutdown, config.healthCheck);

        this.registerStartupTasks();
    }

    /** The bot's discord username, populated by the ready fetch. */
    public get username(): string | undefined {
        return this.fetchedUsername;
    }

    /** The bound server port, populated once `start()` is listening. */
    public get port(): number | undefined {
        return this.boundPort;
    }

    protected override pluginCapabilities(): PluginCapabilities {
        const token = Envapter.get('DISCORD_BOT_TOKEN');
        return { rest: this.rest, ...(token !== undefined && { token }) };
    }

    /**
     * Starts the host and runs the startup tasks.
     *
     * @param port - The port the interaction server binds. {@default `3000`}
     */
    public async start(port = DEFAULT_PORT): Promise<this> {
        this.requestedPort = port;
        try {
            await super.init();
        } catch (caught) {
            // shutdown releases any resource opened before the failure, then rethrow
            await this.shutdown.run(1, false);
            Seedcord.reset();
            throw caught;
        }
        return this;
    }

    protected static override reset(): void {
        super.reset();
        LoggerChannelRegistry.instance.reset();
    }

    private registerStartupTasks(): void {
        if (Envapter.isDevelopment || Envapter.isTest) this.registerHmrAwareModules();

        const { interactions } = this;
        if (interactions) {
            this.startup.addTask(StartupPhase.Configuration, 'Interactions Initialization', async () => {
                interactions.logger.utils.initialization('Interactions', 'start');
                await interactions.init();
                interactions.logger.utils.initialization('Interactions', 'end');
            });
        }

        this.startup.addTask(StartupPhase.Ready, 'Http Server', () => this.listen());

        if (!Envapter.isTest) {
            this.startup.addTask(StartupPhase.Ready, 'Identity', () => this.fetchUsername());
        }

        const { healthCheck } = this;
        if (healthCheck) {
            this.startup.addTask(StartupPhase.Ready, 'Health Check', async () => {
                healthCheck.logger.utils.initialization('HealthCheck', 'start');
                await healthCheck.init();
                healthCheck.logger.utils.initialization('HealthCheck', 'end');
            });
        }
    }

    private registerHmrAwareModules(): void {
        this.startup.addTask(StartupPhase.Configuration, 'HMR Registration', async () => {
            if (this.interactions) this.hmrManager.register(this.interactions);
            for (const plugin of this.plugins) {
                this.hmrManager.register(plugin);
            }
            await Promise.resolve();
        });
    }

    private async listen(): Promise<void> {
        const token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
        this.rest.setToken(token);

        const maps = this.interactions?.maps ?? buildRouteMaps(EMPTY_MANIFEST);
        const { handle, inFlight } = buildEngine(this, maps);

        const server = createServer((incoming, outgoing) => {
            void (async () => {
                const response = await handle(await toWebRequest(incoming));
                await writeWebResponse(response, outgoing);
            })().catch((error: unknown) => {
                // a swallowed throw would hang the client request with no cause
                outgoing.destroy(Error.isError(error) ? error : new Error(String(error)));
            });
        });
        this.server = server;

        server.listen(this.requestedPort);
        await once(server, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        this.boundPort = (server.address() as AddressInfo).port;
        this.logger.info(`Interactions server listening on port ${paint.sky.bold(String(this.boundPort))}`);

        this.shutdown.addTask(
            ShutdownPhase.Unbind,
            'stop-http-server',
            () => this.stopServer(),
            SERVER_SHUTDOWN_TIMEOUT_MS
        );
        // Unbind already ran, so every accepted request is in the in-flight set here
        this.shutdown.addTask(
            ShutdownPhase.Drain,
            'drain-inflight',
            async () => {
                await Promise.allSettled(inFlight);
            },
            DRAIN_TIMEOUT_MS
        );
    }

    private async fetchUsername(): Promise<void> {
        try {
            // justified: the @me payload carries username per the discord api contract
            const me = (await this.rest.get(Routes.user('@me'))) as { username?: string };
            this.fetchedUsername = me.username;
        } catch (caught) {
            // a bad token errors on the first real send. The identity fetch stays non-fatal
            this.logger.warn('could not fetch the bot identity', caught);
        }
    }

    private stopServer(): Promise<void> {
        const server = this.server;
        if (!server?.listening) return Promise.resolve();

        return new Promise((resolveClose, rejectClose) => {
            server.close((err) => {
                if (err) {
                    rejectClose(err);
                    return;
                }
                this.logger.info(paint.coral.bold('Interactions server stopped'));
                resolveClose();
            });
            // idle keep-alive sockets would stall close() past the task timeout. Active responses
            // still flush, and the task timeout bounds a hung one
            server.closeIdleConnections();
        });
    }
}
