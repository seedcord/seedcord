import { once } from 'node:events';
import { createServer } from 'node:http';

import { attachmentsOf, bindBotColor, busLoggerOf, getDevChannel, HmrManager } from '@seedcord/core/internal';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';
import {
    CommandRegistry,
    DRAIN_TASK_TIMEOUT_MS,
    DRAIN_WINDOW_MS,
    drainInFlight,
    ShutdownPhase,
    shutdownOf,
    StartupPhase
} from '@seedcord/core/node/internal';
import { paint } from '@seedcord/errors';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { HostAugmentTarget, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { Routes } from 'discord-api-types/v10';
import { Envapter } from 'envapt';

import { EmojiInjector } from '#src/emojis/EmojiInjector';
import { InteractionsService } from '#src/InteractionsService';
import { version as packageVersion } from '#src/version';

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
 * The HTTP-interactions bot host, a long-running node server around the engine.
 *
 * Discovers handlers from `config.bot.interactions.path`, verifies and dispatches interactions on
 * `start()`, and runs coordinated shutdown with an in-flight drain.
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

    /** Discord REST client built from `bot.restOptions`. `start()` sets the token. */
    public readonly rest: REST;

    /** @see {@link IRateLimiter} */
    public readonly rateLimiter: IRateLimiter;

    /** @see {@link Bus} */
    public readonly bus: Bus;

    readonly #service: InteractionsService;
    readonly #commandRegistry?: CommandRegistry;
    readonly #emojiInjector = new EmojiInjector(this);
    readonly #hmrManager: HmrManager;
    readonly #logger = new Logger('Server', { channel: 'bot' });

    #server?: Server;
    #boundPort?: number;
    #fetchedUsername?: string | undefined;

    public readonly config: HttpServerConfig;

    constructor(config: HttpServerConfig) {
        super('http', new CoordinatedShutdown(config.lifecycle?.shutdownDeadline), new CoordinatedStartup());
        this.config = config;

        installNodeDefaults(config.logger);
        bindBotColor(() => this.config.botColor);

        this.#service = new InteractionsService(this, config, config.bot.restOptions);
        this.rest = this.#service.rest;
        this.rateLimiter = this.#service.rateLimiter;
        this.bus = this.#service.bus;

        this.#hmrManager = new HmrManager();
        this.#hmrManager.init();

        if (this.config.bot.commands.path) this.#commandRegistry = new CommandRegistry(this);

        this.#registerStartupTasks();
    }

    /** The bot's discord username, populated by the ready fetch. */
    public get username(): string | undefined {
        return this.#fetchedUsername;
    }

    /** The bound server port, populated once `start()` is listening. */
    public get port(): number | undefined {
        return this.#boundPort;
    }

    /**
     * Starts the host and runs the startup tasks.
     */
    public async start(): Promise<this> {
        try {
            await super.init();
        } catch (caught) {
            await shutdownOf(this).run(1, false);
            Seedcord.reset(this);
            throw caught;
        }
        return this;
    }

    /** @internal */
    protected static override reset(host?: object): boolean {
        if (!super.reset(host)) return false;
        // super.reset() drops the dev TUI's log sink
        LoggerChannelRegistry.instance.configure({});
        return true;
    }

    #registerStartupTasks(): void {
        if (Envapter.isDevelopment || Envapter.isTest) this.#registerHmrAwareModules();

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

        // needs the token from Configuration, and must finish before Ready opens the server to interactions
        this.startup.addTask(StartupPhase.Login, 'emoji-injection', () => this.#emojiInjector.init());

        const commandRegistry = this.#commandRegistry;
        if (commandRegistry) {
            // one task because tasks in a phase run concurrently and the deploy reads the id
            this.startup.addTask(StartupPhase.Login, 'command-deploy', async () => {
                await commandRegistry.init();
                await commandRegistry.setCommands();
                interactions?.warnUnhandledRoutes(commandRegistry.routeLeaves());
                interactions?.warnUnhandledContextMenuRoutes(commandRegistry.contextMenuLeaves());
            });
        }

        this.startup.addTask(StartupPhase.Ready, 'http-server', () => this.#listen());

        if (!Envapter.isTest) {
            this.startup.addTask(StartupPhase.Ready, 'identity', () => this.#fetchUsername());
        }
    }

    #registerHmrAwareModules(): void {
        this.startup.addTask(StartupPhase.Configuration, 'hmr-registration', async () => {
            if (this.#service.interactions) this.#hmrManager.register(this.#service.interactions);
            if (this.#commandRegistry) this.#hmrManager.register(this.#commandRegistry);
            this.#hmrManager.register(this.#service.subscribers);
            for (const { instance } of attachmentsOf(this)) {
                this.#hmrManager.register(instance);
            }
            await Promise.resolve();
        });
    }

    /** The bot's Discord application id. Throws if you read it before the Configuration phase. */
    public get applicationId(): string {
        return this.#service.applicationId;
    }

    async #listen(): Promise<void> {
        const { handle, inFlight } = this.#service.buildEngine();

        const server = createServer((incoming, outgoing) => {
            void (async () => {
                const response = await handle(await toWebRequest(incoming));
                await writeWebResponse(response, outgoing);
            })().catch((error: unknown) => {
                // a swallowed throw would hang the client with no cause
                outgoing.destroy(Error.isError(error) ? error : new Error(String(error)));
            });
        });
        this.#server = server;

        server.listen(this.config.port ?? DEFAULT_PORT);
        await once(server, 'listening');
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
        // Unbind already ran, so every accepted request is in the in-flight set here
        this.shutdown.addTask(
            ShutdownPhase.Drain,
            'drain-inflight',
            () => drainInFlight(inFlight, DRAIN_WINDOW_MS, this.#logger, 'Interactions'),
            DRAIN_TASK_TIMEOUT_MS
        );
    }

    async #fetchUsername(): Promise<void> {
        try {
            // justified: the @me payload carries username per the discord api contract
            const me = (await this.rest.get(Routes.user('@me'))) as { username?: string };
            this.#fetchedUsername = me.username;
            if (me.username) this.#logger.info(`Running as ${paint.sky.bold(me.username)}`);
        } catch (caught) {
            // a bad token errors on the first real send anyway
            this.#logger.warn('could not fetch the bot identity', caught);
        }
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
            // node's close() leaves idle keep-alive sockets open
            server.closeIdleConnections();
        });
    }
}
