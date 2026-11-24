import {
    bindBotColor,
    busLoggerOf,
    connectDevChannel,
    HmrManager,
    HostHmr,
    SubscriberLoader
} from '@seedcord/core/internal';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';
import { StartupPhase } from '@seedcord/core/node/internal';
import { HostAugmentTarget, HostVersion, SeedcordBrand } from '@seedcord/types/internal';

import { Bot } from './bot/Bot';
import { version as packageVersion } from './version';

import type { GatewayConfig } from './interfaces/Config';
import type { REST } from '@discordjs/rest';
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

        this[HostHmr] = HmrManager.listenTo(connectDevChannel());
        this.#subscribers = new SubscriberLoader(this.bus, config.subscribers.path);
        this.bot = new Bot(this);
        this.rest = this.bot.client.rest;

        this.#registerStartupTasks();
    }

    /** The bot's discord username, populated after login. */
    public get username(): string | undefined {
        return this.bot.client.user?.username;
    }

    #registerStartupTasks(): void {
        const hmr = this[HostHmr];
        if (hmr) this.#registerHmrAwareModules(hmr);

        this.startup.addTask(StartupPhase.Configuration, 'bus-initialization', async () => {
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'start');
            await this.#subscribers.init();
            busLoggerOf(this.bus).utils.initialization('Subscribers', 'end');
        });
    }

    /**
     * Starts the bot and runs all initialization tasks
     *
     * @returns This Seedcord instance when initialized
     */
    public start(): Promise<this> {
        return this.init();
    }

    #registerHmrAwareModules(hmr: HmrManager): void {
        this.startup.addTask(StartupPhase.Configuration, 'hmr-registration', async () => {
            hmr.register(this.bot);
            hmr.register(this.#subscribers);
            await Promise.resolve();
        });
    }
}
