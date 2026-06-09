import { Logger, ShutdownPhase } from '@seedcord/services';
import { EmojiMap } from '@seedcord/types';
import chalk from 'chalk';
import { Client, ClientEvents, Interaction } from 'discord.js';
import { Envapt } from 'envapt';

import { CommandRegistry } from '@bControllers/CommandRegistry';
import { EventController } from '@bControllers/EventController';
import { InteractionController } from '@bControllers/InteractionController';
import { Plugin } from '@interfaces/Plugin';
import { validateDiscordToken } from '@miscellaneous/validateDiscordToken';

import { EmojiInjector, Emojis } from './injectors/EmojiInjector';

import type { Core } from '@interfaces/Core';
import type { HmrUpdateEvent } from '@seedcord/cli';

/**
 * Types of events emitted by the {@link Core.bot} instance.
 */
export interface BotEvents {
    'error:unhandled:interaction': [error: Error];
    'error:unhandled:event': [error: Error];
    'any:event': { [K in keyof ClientEvents]: [K, ...ClientEvents[K]] }[keyof ClientEvents];
    'any:interaction': [interaction: Interaction];
}

/**
 * Discord bot implementation that manages client and controllers
 *
 * Don't instantiate this class directly. Use `core.bot` instead.
 */
export class Bot extends Plugin<BotEvents> {
    @Envapt<string>('DISCORD_BOT_TOKEN', {
        converter: (raw) => validateDiscordToken(raw)
    })
    declare public readonly botToken: string;

    /** @internal */
    public readonly logger = new Logger('Bot');
    private isInitialized = false;

    private readonly _client: Client;
    private readonly interactions?: InteractionController;
    private readonly events?: EventController;
    public readonly commands?: CommandRegistry;
    private readonly emojiInjector: EmojiInjector;
    public readonly emojis: EmojiMap = Emojis;

    /** @internal For use in dev mode */
    public override async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (this.interactions) await this.interactions.onHmr(event);
        if (this.events) await this.events.onHmr(event);
        if (this.commands) await this.commands.onHmr(event);
    }

    /** @internal */
    constructor(core: Core) {
        super(core);

        this._client = new Client(core.config.bot.clientOptions);

        if (core.config.bot.interactions.path) {
            this.interactions = new InteractionController(core);
        }
        if (core.config.bot.events.path) {
            this.events = new EventController(core);
        }

        if (core.config.bot.commands.path) {
            this.commands = new CommandRegistry(core);
        }
        this.emojiInjector = new EmojiInjector(core);

        const BOT_SHUTDOWN_TIMEOUT = 2000;
        core.shutdown.addTask(
            ShutdownPhase.DiscordCleanup,
            'stop-bot',
            async () => await this.stop(),
            BOT_SHUTDOWN_TIMEOUT
        );
    }

    /**
     * Initializes Discord client and all controllers
     * @internal
     */
    public async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        const token = this.botToken;

        if (this.interactions) await this.interactions.init();
        if (this.events) await this.events.init();

        await this.login(token);

        if (this.commands) {
            await this.commands.init();
            await this.commands.setCommands();
            this.interactions?.warnUnhandledRoutes(this.commands.routeLeaves());
        }

        await this.emojiInjector.init();
    }

    /**
     * Stops the bot and cleans up connections
     * @internal
     */
    public async stop(): Promise<void> {
        this._client.removeAllListeners();

        await this.logout();
    }

    /**
     * Logs the bot into Discord using the configured token
     */
    private async login(token: string): Promise<Bot> {
        await this._client.login(token);
        this.logger.info(`Logged in as ${chalk.bold.magenta(this._client.user?.username)}!`);
        return this;
    }

    /**
     * Logs out and destroys the Discord client connection
     */
    private async logout(): Promise<void> {
        await this._client.destroy();
        this.logger.info(chalk.bold.red('Logged out of Discord!'));
    }

    public get client(): Client {
        return this._client;
    }

    /**
     * Emits a Discord event with its argument tuple. The overloads enforce the key/args correlation
     * at compile time only; at runtime this forwards straight to the underlying EventEmitter.
     *
     * @internal
     */
    override emit<TKey extends keyof ClientEvents>(
        event: 'any:event',
        name: TKey,
        ...args: ClientEvents[TKey]
    ): boolean;

    /** @internal */
    override emit<TEventKey extends keyof BotEvents>(event: TEventKey, ...args: BotEvents[TEventKey]): boolean;

    override emit(event: string, ...args: unknown[]): boolean {
        // justified, runtime emit forwards to the base emitter; TS cannot correlate the overload generics across super.emit.
        return super.emit(event as never, ...(args as never));
    }
}
