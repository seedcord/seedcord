import {
    HealthCheck,
    CoordinatedShutdown,
    CoordinatedStartup,
    SeedcordError,
    SeedcordErrorCode,
    StartupPhase
} from '@seedcord/services';
import { SeedcordBrand } from '@seedcord/utils';
import { Envapter } from 'envapt';

import { Bot } from './bot/Bot';
import { EffectsController } from './effects/EffectsController';
import { HmrManager } from './hmr/HmrManager';
import { Pluggable } from './interfaces/Plugin';

import type { Core } from './interfaces/Core';
import type { Config } from '@seedcord/types';

/**
 * Main Seedcord bot framework class
 *
 * Primary entry point for creating Discord bots with Seedcord.
 * Manages component lifecycle and provides plugin support.
 */
export class Seedcord extends Pluggable implements Core {
    public readonly [SeedcordBrand] = true;
    private static isInstantiated = false;
    /** @see {@link CoordinatedShutdown} */
    public override readonly shutdown: CoordinatedShutdown;

    /** @see {@link CoordinatedStartup} */
    public override readonly startup: CoordinatedStartup;

    /** @see {@link EffectsController} */
    public readonly effects: EffectsController;

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
     * @throws An {@link SeedcordError} When attempting to create multiple instances (singleton)
     */
    constructor(public readonly config: Config) {
        // Create lifecycle instances
        const shutdown = new CoordinatedShutdown();
        const startup = new CoordinatedStartup();

        // Pass them to parent constructor
        super(shutdown, startup);

        // Store references for public access
        this.shutdown = shutdown;
        this.startup = startup;

        if (Seedcord.isInstantiated) {
            throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);
        }
        Seedcord.isInstantiated = true;

        this.hmrManager = new HmrManager();
        this.hmrManager.init();
        this.effects = new EffectsController(this as unknown as Core);
        this.bot = new Bot(this as unknown as Core);
        this.healthCheck = new HealthCheck(this.shutdown);

        this.registerStartupTasks();
    }

    /**
     * Resets the singleton state.
     * @internal
     */
    public static reset(): void {
        Seedcord.isInstantiated = false;
    }

    /**
     * Registers default startup tasks
     * @internal
     */
    private registerStartupTasks(): void {
        if (Envapter.isDevelopment) this.registerHmrAwareModules();

        this.startup.addTask(StartupPhase.Configuration, 'Effect Initialization', async () => {
            this.effects.logger.utils.initialization('Effects', 'start');
            await this.effects.init();
            this.effects.logger.utils.initialization('Effects', 'end');
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
