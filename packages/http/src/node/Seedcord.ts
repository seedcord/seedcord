import { once } from 'node:events';
import { createServer } from 'node:http';

import { REST } from '@discordjs/rest';
import { Bus } from '@seedcord/core';
import { CommandInjector, getDevChannel, HmrManager, setBotColor } from '@seedcord/core/internal';
import {
    CommandRegistry,
    CoordinatedShutdown,
    CoordinatedStartup,
    Pluggable,
    ShutdownPhase,
    StartupPhase,
    SubscriberLoader
} from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { Logger, LoggerChannelRegistry, paint } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { SeedcordBrand } from '@seedcord/types/internal';
import { Routes } from 'discord-api-types/v10';
import { Envapter } from 'envapt';

import { fetchApplicationId } from '@src/applicationId';
import { buildRouteMaps } from '@src/dispatch/resolve';
import { EmojiInjector } from '@src/emojis/EmojiInjector';
import { buildEngine } from '@src/engine';
import { EMPTY_MANIFEST } from '@src/manifest/RouteManifest';

import { InteractionDispatcher } from './InteractionDispatcher';
import { toWebRequest, writeWebResponse } from './webBridge';
import { version as packageVersion } from '../version';

import type { HttpConfig } from '@interfaces/Config';
import type { Core } from '@interfaces/Core';
import type { IRateLimiter } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const DEFAULT_PORT = 3000;
const SERVER_SHUTDOWN_TIMEOUT_MS = 5000;
const DRAIN_TIMEOUT_MS = 10_000;

type RuntimeOfConfig<Cfg extends HttpConfig> = Cfg extends { runtime: 'edge' } ? 'edge' : 'server';

/**
 * The HTTP-interactions bot host, a long-running node server around the engine.
 *
 * Discovers handlers from `config.bot.interactions.path`, verifies and dispatches interactions on
 * `start()`, and runs coordinated shutdown with an in-flight drain. The edge deploy path calls
 * `createSeedcord` from a generated entry.
 */
export class Seedcord<Cfg extends HttpConfig = HttpConfig>
    extends Pluggable<'http', RuntimeOfConfig<Cfg>>
    implements Core, SeedcordInstance
{
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

    /** @see {@link Bus} */
    public readonly bus: Bus;

    private readonly subscribers: SubscriberLoader;

    private readonly interactions?: InteractionDispatcher;
    private readonly commandRegistry?: CommandRegistry;
    private appId?: string;
    private appIdPromise?: Promise<string>;
    private readonly emojiInjector = new EmojiInjector(this, () => this.applicationId());
    private readonly hmrManager: HmrManager;
    private readonly logger = new Logger('Server', { channel: 'bot' });

    private server?: Server;
    private boundPort?: number;
    private fetchedUsername?: string | undefined;

    constructor(public readonly config: Cfg) {
        super(new CoordinatedShutdown(), new CoordinatedStartup());

        installNodeDefaults(config.logger);
        setBotColor(config.botColor);

        this.hmrManager = new HmrManager();
        this.hmrManager.init();

        if (this.config.bot.interactions.path) {
            this.interactions = new InteractionDispatcher(this.config.bot.interactions.path);
        }

        const commandsDir = this.config.bot.commands.path;
        if (commandsDir) {
            const injector = new CommandInjector();
            // onDeployed only fires at deploy time, long after registry is assigned
            const registry: CommandRegistry = new CommandRegistry({
                dir: commandsDir,
                rest: this.rest,
                applicationId: () => this.requireApplicationId(),
                onDeployed: (result) => {
                    injector.inject(result, registry.allCommands());
                }
            });
            this.commandRegistry = registry;
        }

        this.rateLimiter = config.store ?? new MemoryRateLimiter();
        this.bus = new Bus(this);
        this.subscribers = new SubscriberLoader(this.bus, config.subscribers.path);

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

    /**
     * Starts the host and runs the startup tasks.
     */
    public async start(): Promise<this> {
        try {
            await super.init();
        } catch (caught) {
            await this.shutdown.run(1, false);
            Seedcord.reset();
            throw caught;
        }
        return this;
    }

    protected static override reset(): void {
        super.reset();
        // super.reset() drops the dev TUI's log sink
        LoggerChannelRegistry.instance.configure({});
    }

    private registerStartupTasks(): void {
        if (Envapter.isDevelopment || Envapter.isTest) this.registerHmrAwareModules();

        this.startup.addTask(StartupPhase.Configuration, 'bus-initialization', async () => {
            this.bus.logger.utils.initialization('Subscribers', 'start');
            await this.subscribers.init();
            this.bus.logger.utils.initialization('Subscribers', 'end');
        });

        const { interactions } = this;
        if (interactions) {
            this.startup.addTask(StartupPhase.Configuration, 'interactions-initialization', async () => {
                interactions.logger.utils.initialization('Interactions', 'start');
                await interactions.init();
                interactions.logger.utils.initialization('Interactions', 'end');
            });
        }

        this.startup.addTask(StartupPhase.Configuration, 'authenticate', () => {
            this.authenticate();
            return Promise.resolve();
        });

        // needs the token from Configuration, and must finish before Ready opens the server to interactions
        this.startup.addTask(StartupPhase.Login, 'emoji-injection', () => this.emojiInjector.init());

        const { commandRegistry } = this;
        if (commandRegistry) {
            // one task because tasks in a phase run concurrently and the deploy reads the id
            this.startup.addTask(StartupPhase.Login, 'command-deploy', async () => {
                await commandRegistry.init();
                this.appId = await this.applicationId();
                await commandRegistry.setCommands();
                interactions?.warnUnhandledRoutes(commandRegistry.routeLeaves());
                interactions?.warnUnhandledContextMenuRoutes(commandRegistry.contextMenuLeaves());
            });
        }

        this.startup.addTask(StartupPhase.Ready, 'http-server', () => this.listen());

        if (!Envapter.isTest) {
            this.startup.addTask(StartupPhase.Ready, 'identity', () => this.fetchUsername());
        }
    }

    private registerHmrAwareModules(): void {
        this.startup.addTask(StartupPhase.Configuration, 'hmr-registration', async () => {
            if (this.interactions) this.hmrManager.register(this.interactions);
            if (this.commandRegistry) this.hmrManager.register(this.commandRegistry);
            this.hmrManager.register(this.subscribers);
            for (const plugin of this.plugins) {
                this.hmrManager.register(plugin);
            }
            await Promise.resolve();
        });
    }

    private authenticate(): void {
        this.rest.setToken(validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN')));
    }

    private applicationId(): Promise<string> {
        this.appIdPromise ??= fetchApplicationId(this.rest);
        return this.appIdPromise;
    }

    // the registry redeploys on a hot reload, after the startup task resolved this
    private requireApplicationId(): string {
        if (!this.appId) throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable);
        return this.appId;
    }

    private async listen(): Promise<void> {
        const maps = this.interactions?.maps ?? buildRouteMaps(EMPTY_MANIFEST);
        const { handle, inFlight } = buildEngine(this, maps);

        const server = createServer((incoming, outgoing) => {
            void (async () => {
                const response = await handle(await toWebRequest(incoming));
                await writeWebResponse(response, outgoing);
            })().catch((error: unknown) => {
                // a swallowed throw would hang the client with no cause
                outgoing.destroy(Error.isError(error) ? error : new Error(String(error)));
            });
        });
        this.server = server;

        server.listen(this.config.port ?? DEFAULT_PORT);
        await once(server, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        this.boundPort = (server.address() as AddressInfo).port;
        this.logger.info(`Interactions server listening on port ${paint.sky.bold(String(this.boundPort))}`);
        getDevChannel()?.send('seedcord:server-listening', { port: this.boundPort });

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
            if (me.username) this.logger.info(`Running as ${paint.sky.bold(me.username)}`);
        } catch (caught) {
            // a bad token errors on the first real send anyway
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
            // close() waits on idle keep-alive sockets. active responses still flush, and the task
            // timeout bounds a hung one
            server.closeIdleConnections();
        });
    }
}
