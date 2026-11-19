import { bindBotColor, busLoggerOf, connectDevChannel, HmrManager, SubscriberLoader } from '@seedcord/core/internal';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';
import { healthCheckConfig, HealthResponder, StartupPhase, WebServer } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';
import { HostAugmentTarget, HostPlugins, HostStartup, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { Bot } from './bot/Bot';
import { version as packageVersion } from './version';

import type { GatewayConfig } from './interfaces/Config';
import type { REST } from '@discordjs/rest';
import type { HealthCheckConfig } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';

const DEFAULT_HEALTH_PORT = 6967;
const NOT_FOUND = 404;

/**
 * The gateway bot host. Opens a discord.js gateway session, discovers handlers, and runs
 * coordinated startup and shutdown. Attach plugins with `attach()`.
 */
// an `implements Core` clause breaks a bot's full lib check once codegen adds its plugins to Core
export class Seedcord extends ServerHost<'gateway'> implements SeedcordInstance {
    // the CLI reads these to detect and augment the instance
    /** @internal */
    public readonly [SeedcordBrand] = true;
    /** @internal */
    public readonly [HostAugmentTarget] = '@seedcord/gateway';
    /** @internal */
    public readonly [HostVersion]: string = packageVersion;

    readonly #health: HealthCheckConfig | undefined;
    readonly #web: WebServer;
    readonly #logger = new Logger('Server', { channel: 'bot' });
    readonly #hmrManager: HmrManager;

    readonly #subscribers: SubscriberLoader;

    /** @see {@link Bot} */
    public readonly bot: Bot;

    /** The discord.js client's REST client. Its token is set during the Login phase. */
    public readonly rest: REST;

    /** The bot's Discord application id. Throws if you read it before login. */
    public get applicationId(): string {
        return this.bot.applicationId;
    }

    /**
     * @param config - Bot configuration including paths and Discord client options
     * @throws A **SeedcordError** when another `Seedcord` exists in this process and has not shut down.
     * @throws A **SeedcordError** when the running Node or Bun is older than the range in `engines`.
     */
    constructor(public readonly config: GatewayConfig) {
        super(
            'gateway',
            new CoordinatedShutdown(config.lifecycle?.shutdownDeadline),
            new CoordinatedStartup(),
            config.kv
        );

        bindBotColor(() => this.config.botColor);

        this.#hmrManager = new HmrManager();
        this.#hmrManager.init(connectDevChannel());
        this.#subscribers = new SubscriberLoader(this.bus, config.subscribers.path);
        this.bot = new Bot(this);
        this.rest = this.bot.client.rest;
        this.#health = healthCheckConfig(config.healthCheck);
        this.#web = new WebServer({
            logger: this.#logger,
            shutdown: this.shutdown,
            startup: this[HostStartup],
            health: this.#health && new HealthResponder(this.#health.path),
            plugins: async (request) => this[HostPlugins].answer(request),
            // nothing else sits at any path because a gateway bot takes interactions over the websocket
            tail: () => Promise.resolve(new Response(null, { status: NOT_FOUND })),
            portSetting: 'healthCheck.port'
        });

        this.#registerStartupTasks();
    }

    /**
     * Answers one web request: the health path, then each plugin's `fetch` in attach order, then a 404.
     * Mount it in your own server to serve plugin routes on a port you already run.
     *
     * Rejects with `CoreFetchBeforeStart` until `start()` is called. While `start()` runs, the health
     * path answers 503 and any other request waits until startup finishes. Answers 503 once shutdown
     * begins or `start()` fails.
     */
    public fetch(request: Request): Promise<Response> {
        return this.#web.fetch(request);
    }

    /** The bot's discord username, populated after login. */
    public get username(): string | undefined {
        return this.bot.client.user?.username;
    }

    #registerStartupTasks(): void {
        if (Envapter.isDevelopment || Envapter.isTest) this.#registerHmrAwareModules();

        this.startup.addTask(StartupPhase.Configuration, 'bus-initialization', async () => {
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'start');
            await this.#subscribers.init();
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'end');
        });
    }

    /** @internal */
    protected override async openServer(): Promise<void> {
        const health = this.#health;
        if (health || this[HostPlugins].answersRequests) {
            await this.#web.listen(health?.port ?? DEFAULT_HEALTH_PORT, health?.host);
        }
        this.#web.open();
    }

    /**
     * Starts the bot and runs all initialization tasks
     *
     * @returns This Seedcord instance when initialized
     */
    public start(): Promise<this> {
        return this.init();
    }

    #registerHmrAwareModules(): void {
        this.startup.addTask(StartupPhase.Configuration, 'hmr-registration', async () => {
            this.#hmrManager.register(this.bot);
            this.#hmrManager.register(this.#subscribers);
            for (const { instance } of this[HostPlugins].attachments) {
                this.#hmrManager.register(instance);
            }
            await Promise.resolve();
        });
    }
}
