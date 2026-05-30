import {
    HealthCheck,
    CoordinatedShutdown,
    CoordinatedStartup,
    SeedcordErrorCode,
    StartupPhase
} from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { SeedcordBrand } from '@seedcord/types/internal';
import { Envapter } from 'envapt';

import { Bot } from './bot/Bot';
import { HmrManager } from './hmr/HmrManager';
import { Pluggable } from './interfaces/Plugin';
import { Bus } from './subscribers/Bus';

import type { Core } from './interfaces/Core';
import type { Config } from '@seedcord/types';

/**
 * Main Seedcord bot framework class
 *
 * Primary entry point for creating Discord bots with Seedcord.
 * Manages component lifecycle and provides plugin support.
 */
export class Seedcord extends Pluggable implements Core {
    /**
     * Brands this instance as a Seedcord instance using {@link SeedcordBrand}
     *
     * @internal
     * */
    public readonly [SeedcordBrand] = true;

    private static isInstantiated = false;
    /** @see {@link CoordinatedShutdown} */
    public override readonly shutdown: CoordinatedShutdown;

    /** @see {@link CoordinatedStartup} */
    public override readonly startup: CoordinatedStartup;

    /** @see {@link Bus} */
    public readonly bus: Bus;

    /** @see {@link Bot} */
    public readonly bot: Bot;

    /** @see {@link HealthCheck} */
    private readonly healthCheck: HealthCheck;

    /** @see {@link HmrManager} */
    private readonly hmrManager: HmrManager;

    /**
     * Creates a new Seedcord instance
     *
     * @param config - Bot configuration including paths and Discord client options
     * @throws A {@link SeedcordError} When attempting to create multiple instances (singleton)
     */
    constructor(public readonly config: Config) {
        if (Seedcord.isInstantiated) {
            throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        }

        Seedcord.isInstantiated = true;

        // Create lifecycle instances
        const shutdown = new CoordinatedShutdown();
        const startup = new CoordinatedStartup();

        // Pass them to parent constructor
        super(shutdown, startup);

        // Store references for public access
        this.shutdown = shutdown;
        this.startup = startup;

        this.hmrManager = new HmrManager();
        this.hmrManager.init();
        this.bus = new Bus(this);
        this.bot = new Bot(this);
        this.healthCheck = new HealthCheck(this.shutdown);

        this.registerStartupTasks();
    }

    /**
     * Resets the singleton state.
     * @internal
     */
    // @ts-expect-error: Used only for testing purposes
    private static reset(): void {
        Seedcord.isInstantiated = false;
    }

    /**
     * Registers default startup tasks
     * @internal
     */
    private registerStartupTasks(): void {
        if (Envapter.isDevelopment) this.registerHmrAwareModules();

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
            for (const plugin of this.plugins) {
                this.hmrManager.register(plugin);
            }
            await Promise.resolve();
        });
    }
}
