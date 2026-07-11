import { HmrManager, setBotColor } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { HealthCheck, CoordinatedShutdown, CoordinatedStartup, StartupPhase } from '@seedcord/services';
import { SeedcordBrand } from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { Bot } from './bot/Bot';
import { Pluggable } from './interfaces/Plugin';
import { Bus } from './subscribers/Bus';
import { version as packageVersion } from './version';

import type { GatewayConfig } from './interfaces/Config';
import type { Core } from './interfaces/Core';
import type { IRateLimiter } from '@seedcord/types';

/**
 * Main Seedcord bot framework class
 *
 * Primary entry point for creating Discord bots with Seedcord.
 * Manages component lifecycle and provides plugin support.
 */
export class Seedcord extends Pluggable implements Core {
    // the CLI reads these to detect and augment the instance
    /** @internal */
    public readonly [SeedcordBrand] = true;
    /** @internal */
    public readonly augmentTarget = '@seedcord/gateway';
    /** @internal */
    public readonly version: string = packageVersion;

    private static isInstantiated = false;
    private readonly healthCheck: HealthCheck;
    private readonly hmrManager: HmrManager;

    /** @see {@link CoordinatedShutdown} */
    public override readonly shutdown: CoordinatedShutdown;

    /** @see {@link CoordinatedStartup} */
    public override readonly startup: CoordinatedStartup;

    /** @see {@link Bus} */
    public readonly bus: Bus;

    /** @see {@link Bot} */
    public readonly bot: Bot;

    /** @see {@link IRateLimiter} */
    public readonly rateLimiter: IRateLimiter;

    /**
     * Creates a new Seedcord instance
     *
     * @param config - Bot configuration including paths and Discord client options
     * @throws A **SeedcordError** When attempting to create multiple instances (singleton)
     */
    constructor(public readonly config: GatewayConfig) {
        if (Seedcord.isInstantiated) {
            throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        }

        Seedcord.isInstantiated = true;

        const shutdown = new CoordinatedShutdown(config.shutdownEnabled);
        const startup = new CoordinatedStartup();

        super(shutdown, startup);

        installNodeDefaults(config.logger);
        setBotColor(config.botColor);

        this.shutdown = shutdown;
        this.startup = startup;

        this.hmrManager = new HmrManager();
        this.hmrManager.init();
        this.bus = new Bus(this);
        this.bot = new Bot(this);
        this.rateLimiter = config.store ?? new MemoryRateLimiter();
        this.healthCheck = new HealthCheck(this.shutdown, config.healthCheck);

        this.registerStartupTasks();
    }

    /** The bot's discord username, populated after login. */
    public get username(): string | undefined {
        return this.bot.client.user?.username;
    }

    // @ts-expect-error called only by tests, so the source build sees it as unused
    private static reset(): void {
        Seedcord.isInstantiated = false;
        LoggerChannelRegistry.instance.reset();
    }

    private registerStartupTasks(): void {
        if (Envapter.isDevelopment || Envapter.isTest) this.registerHmrAwareModules();

        this.startup.addTask(StartupPhase.Configuration, 'Bus Initialization', async () => {
            this.bus.logger.utils.initialization('Subscribers', 'start');
            await this.bus.init();
            this.bus.logger.utils.initialization('Subscribers', 'end');
        });

        this.startup.addTask(StartupPhase.Instantiation, 'Bot Initialization', async () => {
            this.bot.logger.utils.initialization('Bot', 'start');
            await this.bot.init();
            this.bot.logger.utils.initialization('Bot', 'end');
        });

        this.startup.addTask(StartupPhase.Ready, 'Health Check', async () => {
            this.healthCheck.logger.utils.initialization('HealthCheck', 'start');
            await this.healthCheck.init();
            this.healthCheck.logger.utils.initialization('HealthCheck', 'end');
        });
    }

    /**
     * Starts the bot and runs all initialization tasks
     *
     * @returns This Seedcord instance when fully initialized
     */
    public async start(): Promise<this> {
        await super.init();
        return this;
    }

    private registerHmrAwareModules(): void {
        this.startup.addTask(StartupPhase.Configuration, 'HMR Registration', async () => {
            this.hmrManager.register(this.bot);
            this.hmrManager.register(this.bus);
            for (const plugin of this.plugins) {
                this.hmrManager.register(plugin);
            }
            await Promise.resolve();
        });
    }
}
