import { REST } from '@discordjs/rest';
import { bindBotColor, busLoggerOf, connectDevChannel, getDevChannel, HmrManager } from '@seedcord/core/internal';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';
import { HealthResponder, StartupPhase, WebServer } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';
import {
    HostAugmentTarget,
    HostListenHost,
    HostPlugins,
    HostStartup,
    HostVersion,
    SeedcordBrand
} from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { HttpStartupTasks } from '#src/HttpStartupTasks';
import { InteractionsService } from '#src/InteractionsService';
import { requestScope } from '#src/requestScope';
import { usernameOf } from '#src/username';
import { version as packageVersion } from '#src/version';

import type { HttpServerConfig } from '#interfaces/Config';
import type { SeedcordInstance } from '@seedcord/types/internal';

const DEFAULT_PORT = 3000;

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

    readonly #service: InteractionsService;
    readonly #web: WebServer;
    readonly #hmrManager: HmrManager;
    readonly #logger = new Logger('Server', { channel: 'bot' });

    #boundPort: number | undefined;
    #fetchedUsername?: string | undefined;

    public readonly config: HttpServerConfig;

    /**
     * @throws A **SeedcordError** when another `Seedcord` exists in this process and has not shut down.
     * @throws A **SeedcordError** when the running Node or Bun is older than the range in `engines`.
     */
    constructor(config: HttpServerConfig) {
        super('http', new CoordinatedShutdown(config.lifecycle?.shutdownDeadline), new CoordinatedStartup(), config.kv);
        this.config = config;

        bindBotColor(() => this.config.botColor);

        this.#service = new InteractionsService(this, config, new REST(config.bot.restOptions));
        this.rest = this.#service.rest;
        this.#web = new WebServer({
            logger: this.#logger,
            shutdown: this.shutdown,
            startup: this[HostStartup],
            health: HealthResponder.fromOption(config.healthCheck),
            plugins: async (request) => this[HostPlugins].answer(request),
            tail: async (request) => requestScope.run(this.#web, async () => this.#service.engine.handle(request)),
            portSetting: 'port'
        });

        this.#hmrManager = new HmrManager();
        this.#hmrManager.init(connectDevChannel());

        this.#registerStartupTasks();
    }

    /** The bot's discord username, populated by the ready fetch. */
    public get username(): string | undefined {
        return this.#fetchedUsername;
    }

    /** The bound server port, set once `start()` is listening. Always `undefined` with `port: false`. */
    public get port(): number | undefined {
        return this.#boundPort;
    }

    /**
     * Starts the host and runs the startup tasks.
     */
    public start(): Promise<this> {
        return this.init();
    }

    /**
     * Answers one web request: the health path, then each plugin's `fetch` in attach order, then
     * Discord's interactions. Anything besides a POST that reaches the interactions gets a 404. Mount
     * it in your own server when the config sets `port: false`, and send it every path so plugin
     * routes reach the bot.
     *
     * Rejects with `CoreFetchBeforeStart` until `start()` is called. Until every plugin's `ready()`
     * finishes, the health path answers 503. Any other request waits until the Ready phase begins.
     * Answers 503 once shutdown begins or `start()` fails.
     *
     * @example
     * ```ts
     * // Hono passes the untouched request through c.req.raw
     * const seedcord = new Seedcord({ ...config, port: false });
     * await seedcord.start();
     *
     * const app = new Hono();
     * app.all('*', (c) => seedcord.fetch(c.req.raw));
     * ```
     */
    public fetch(request: Request): Promise<Response> {
        return this.#web.fetch(request);
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

        this.startup.addTask(StartupPhase.Ready, 'web-server', async () => {
            const { port = DEFAULT_PORT } = this.config;
            this.#boundPort = await this.#web.serve(port === false ? undefined : { port, host: this[HostListenHost] });
            // seedcord dev opens its tunnel to this port
            getDevChannel()?.send('seedcord:server-port', { port: this.#boundPort ?? false });
        });

        if (!Envapter.isTest) {
            this.startup.addTask(StartupPhase.Ready, 'identity', () => this.#fetchUsername());
        }
    }

    /** The bot's Discord application id. Throws if you read it before the Configuration phase. */
    public get applicationId(): string {
        return this.#service.applicationId;
    }

    async #fetchUsername(): Promise<void> {
        this.#fetchedUsername = await usernameOf(this.rest, this.#logger);
    }
}
