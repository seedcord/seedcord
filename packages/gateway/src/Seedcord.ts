import { Bus } from '@seedcord/core';
import { attachmentsOf, bindBotColor, busLoggerOf, HmrManager } from '@seedcord/core/internal';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';
import { HealthCheck, shutdownOf, StartupPhase, SubscriberLoader } from '@seedcord/core/node/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { HostAugmentTarget, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { botLoggerOf, Bot, initBot } from './bot/Bot';
import { version as packageVersion } from './version';

import type { GatewayConfig } from './interfaces/Config';
import type { REST } from '@discordjs/rest';
import type { IRateLimiter } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';

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

    readonly #healthCheck?: HealthCheck | undefined;
    readonly #hmrManager: HmrManager;

    /** @see {@link Bus} */
    public readonly bus: Bus;

    readonly #subscribers: SubscriberLoader;

    /** @see {@link Bot} */
    public readonly bot: Bot;

    /** The discord.js client's REST client. Its token is set during the Login phase. */
    public readonly rest: REST;

    /** The bot's Discord application id. Throws if you read it before login. */
    public get applicationId(): string {
        return this.bot.applicationId;
    }

    /** @see {@link IRateLimiter} */
    public readonly rateLimiter: IRateLimiter;

    /**
     * @param config - Bot configuration including paths and Discord client options
     * @throws A **SeedcordError** When attempting to create multiple instances (singleton)
     */
    constructor(public readonly config: GatewayConfig) {
        super('gateway', new CoordinatedShutdown(config.lifecycle?.shutdownDeadline), new CoordinatedStartup());

        installNodeDefaults(config.logger);
        bindBotColor(() => this.config.botColor);

        this.#hmrManager = new HmrManager();
        this.#hmrManager.init();
        this.bus = new Bus(this);
        this.#subscribers = new SubscriberLoader(this.bus, config.subscribers.path);
        this.bot = new Bot(this);
        this.rest = this.bot.client.rest;
        this.rateLimiter = config.store ?? new MemoryRateLimiter();
        this.#healthCheck = HealthCheck.fromOption(shutdownOf(this), config.healthCheck);

        this.#registerStartupTasks();
    }

    /** The bot's discord username, populated after login. */
    public get username(): string | undefined {
        return this.bot.client.user?.username;
    }

    protected static override reset(host?: object): boolean {
        if (!super.reset(host)) return false;
        // reset() would drop the dev TUI's log sink
        LoggerChannelRegistry.instance.configure({});
        return true;
    }

    #registerStartupTasks(): void {
        if (Envapter.isDevelopment || Envapter.isTest) this.#registerHmrAwareModules();

        this.startup.addTask(StartupPhase.Configuration, 'bus-initialization', async () => {
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'start');
            await this.#subscribers.init();
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'end');
        });

        this.startup.addTask(StartupPhase.Login, 'bot-initialization', async () => {
            botLoggerOf(this.bot).utils.initialization('Bot', 'start');
            await initBot(this.bot);
            botLoggerOf(this.bot).utils.initialization('Bot', 'end');
        });

        const healthCheck = this.#healthCheck;
        if (healthCheck) {
            this.startup.addTask(StartupPhase.Ready, 'health-check', async () => {
                healthCheck.logger.utils.initialization('HealthCheck', 'start');
                await healthCheck.init();
                healthCheck.logger.utils.initialization('HealthCheck', 'end');
            });
        }
    }

    /**
     * Starts the bot and runs all initialization tasks
     *
     * @returns This Seedcord instance when initialized
     */
    public async start(): Promise<this> {
        try {
            await super.init();
        } catch (caught) {
            // shutdown releases any resource opened before the failure, then rethrow
            await shutdownOf(this).run(1, false);
            Seedcord.reset(this);
            throw caught;
        }
        return this;
    }

    #registerHmrAwareModules(): void {
        this.startup.addTask(StartupPhase.Configuration, 'hmr-registration', async () => {
            this.#hmrManager.register(this.bot);
            this.#hmrManager.register(this.#subscribers);
            for (const { instance } of attachmentsOf(this)) {
                this.#hmrManager.register(instance);
            }
            await Promise.resolve();
        });
    }
}
