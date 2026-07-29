import { Bus } from '@seedcord/core';
import { HmrManager, setBotColor } from '@seedcord/core/internal';
import {
    HealthCheck,
    CoordinatedShutdown,
    CoordinatedStartup,
    StartupPhase,
    Pluggable,
    SubscriberLoader
} from '@seedcord/core/node/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { SeedcordBrand } from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { Bot } from './bot/Bot';
import { version as packageVersion } from './version';

import type { GatewayConfig } from './interfaces/Config';
import type { Core } from './interfaces/Core';
import type { PluginCapabilities } from '@seedcord/core/node/internal';
import type { IRateLimiter } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';

/**
 * The gateway bot host. Opens a discord.js gateway session, discovers handlers, and runs
 * coordinated startup and shutdown. Attach plugins with `attach()`.
 */
export class Seedcord extends Pluggable<'gateway', 'server'> implements Core, SeedcordInstance {
    // the CLI reads these to detect and augment the instance
    /** @internal */
    public readonly [SeedcordBrand] = true;
    /** @internal */
    public readonly augmentTarget = '@seedcord/gateway';
    /** @internal */
    public readonly version: string = packageVersion;

    private readonly healthCheck?: HealthCheck | undefined;
    private readonly hmrManager: HmrManager;

    /** @see {@link Bus} */
    public readonly bus: Bus;

    private readonly subscribers: SubscriberLoader;

    /** @see {@link Bot} */
    public readonly bot: Bot;

    /** @see {@link IRateLimiter} */
    public readonly rateLimiter: IRateLimiter;

    /**
     * @param config - Bot configuration including paths and Discord client options
     * @throws A **SeedcordError** When attempting to create multiple instances (singleton)
     */
    constructor(public readonly config: GatewayConfig) {
        super(new CoordinatedShutdown(), new CoordinatedStartup());

        installNodeDefaults(config.logger);
        setBotColor(config.botColor);

        this.hmrManager = new HmrManager();
        this.hmrManager.init();
        this.bus = new Bus(this);
        this.subscribers = new SubscriberLoader(this.bus, config.subscribers.path);
        this.bot = new Bot(this);
        this.rateLimiter = config.store ?? new MemoryRateLimiter();
        this.healthCheck = HealthCheck.fromOption(this.shutdown, config.healthCheck);

        this.registerStartupTasks();
    }

    /** The bot's discord username, populated after login. */
    public get username(): string | undefined {
        return this.bot.client.user?.username;
    }

    protected override pluginCapabilities(): PluginCapabilities {
        return { client: this.bot.client, token: this.bot.botToken, rest: this.bot.client.rest };
    }

    protected static override reset(): void {
        super.reset();
        LoggerChannelRegistry.instance.reset();
    }

    private registerStartupTasks(): void {
        if (Envapter.isDevelopment || Envapter.isTest) this.registerHmrAwareModules();

        this.startup.addTask(StartupPhase.Configuration, 'Bus Initialization', async () => {
            this.bus.logger.utils.initialization('Subscribers', 'start');
            await this.subscribers.init();
            this.bus.logger.utils.initialization('Subscribers', 'end');
        });

        this.startup.addTask(StartupPhase.Login, 'Bot Initialization', async () => {
            this.bot.logger.utils.initialization('Bot', 'start');
            await this.bot.init();
            this.bot.logger.utils.initialization('Bot', 'end');
        });

        const { healthCheck } = this;
        if (healthCheck) {
            this.startup.addTask(StartupPhase.Ready, 'Health Check', async () => {
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
            await this.shutdown.run(1, false);
            Seedcord.reset();
            throw caught;
        }
        return this;
    }

    private registerHmrAwareModules(): void {
        this.startup.addTask(StartupPhase.Configuration, 'HMR Registration', async () => {
            this.hmrManager.register(this.bot);
            this.hmrManager.register(this.subscribers);
            for (const plugin of this.plugins) {
                this.hmrManager.register(plugin);
            }
            await Promise.resolve();
        });
    }
}
