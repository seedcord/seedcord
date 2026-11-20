import { REST } from '@discordjs/rest';
import { bindBotColor, busLoggerOf, connectDevChannel, HmrManager } from '@seedcord/core/internal';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';
import { StartupPhase } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';
import { HostAugmentTarget, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { HttpStartupTasks } from '#src/HttpStartupTasks';
import { InteractionsService } from '#src/InteractionsService';
import { usernameOf } from '#src/username';
import { version as packageVersion } from '#src/version';

import type { HttpServerConfig } from '#interfaces/Config';
import type { SeedcordInstance } from '@seedcord/types/internal';

/**
 * The HTTP-interactions bot on node. `start()` loads handlers from `config.bot.interactions.path`
 * and binds a server on `server.port`. With `server: { port: false }`, your own server passes
 * requests to `fetch()`.
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

    /** Discord REST client built from `bot.restOptions`. `start()` sets the token. */
    public readonly rest: REST;

    readonly #service: InteractionsService;
    readonly #hmrManager: HmrManager;
    readonly #logger = new Logger('Bot', { channel: 'bot' });

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

        this.#hmrManager = new HmrManager();
        this.#hmrManager.init(connectDevChannel());

        this.#registerStartupTasks();
    }

    /** The bot's discord username, populated by the ready fetch. */
    public get username(): string | undefined {
        return this.#fetchedUsername;
    }

    /**
     * Starts the host and runs the startup tasks.
     */
    public start(): Promise<this> {
        return this.init();
    }

    /** @internal */
    protected override answerInteractions(request: Request): Promise<Response> {
        return this.#service.engine.handle(request);
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
