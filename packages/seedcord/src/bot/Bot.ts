import { Logger, SeedcordError, SeedcordErrorCode, ShutdownPhase } from '@seedcord/services';
import chalk from 'chalk';
import { Client, ClientEvents, Interaction } from 'discord.js';
import { Envapt } from 'envapt';

import { CommandRegistry } from '@bControllers/CommandRegistry';
import { EventController } from '@bControllers/EventController';
import { InteractionController } from '@bControllers/InteractionController';
import { Plugin } from '@interfaces/Plugin';

import { EmojiInjector, Emojis, type EmojiMap } from './injectors/EmojiInjector';

import type { Core } from '@interfaces/Core';

/**
 * Bot event types
 */
export interface BotEvents {
    'error:unhandled:interaction': [error: Error];
    'error:unhandled:event': [error: Error];
    'any:event': { [K in keyof ClientEvents]: [K, ...ClientEvents[K]] }[keyof ClientEvents];
    'any:interaction': [interaction: Interaction];
}

/**
 * Discord bot implementation that manages client and controllers
 * @internal - Accessed via core.bot, not directly instantiated by users
 */
export class Bot extends Plugin<BotEvents> {
    @Envapt<string>('DISCORD_BOT_TOKEN', {
        converter(raw, _fallback) {
            if (typeof raw !== 'string') {
                throw new SeedcordError(SeedcordErrorCode.ConfigMissingDiscordToken);
            }
            return raw;
        }
    })
    declare public readonly botToken: string;

    public readonly logger = new Logger('Bot');
    private isInitialized = false;

    private readonly _client: Client;
    private readonly interactions: InteractionController;
    private readonly events: EventController;
    public readonly commands: CommandRegistry;
    private readonly emojiInjector: EmojiInjector;
    public readonly emojis: EmojiMap = Emojis;

    constructor(protected core: Core) {
        super(core);

        this._client = new Client(core.config.bot.clientOptions);

        this.interactions = new InteractionController(core);
        this.events = new EventController(core);

        this.commands = new CommandRegistry(core);
        this.emojiInjector = new EmojiInjector(core);

        core.shutdown.addTask(ShutdownPhase.DiscordCleanup, 'stop-bot', async () => await this.stop());
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

        await this.interactions.init();
        await this.events.init();

        await this.login();

        await this.commands.init();
        await this.commands.setCommands();

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
    private async login(): Promise<Bot> {
        await this._client.login(this.botToken);
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
     * Emits with correlation between a Discord event key and its exact arg tuple.
     *
     * @typeParam TKey - Discord event name
     * @param event - Must be the literal `any:event`
     * @param name - Concrete Discord event name
     * @param args - Exact tuple for that Discord event
     */
    override emit<TKey extends keyof ClientEvents>(
        event: 'any:event',
        name: TKey,
        ...args: ClientEvents[TKey]
    ): boolean;

    /**
     * Fallback for other BotEvents keys.
     *
     * @typeParam TEventKey - Bot event key
     * @param event - Bot event key
     * @param args - Tuple payload for the key
     */
    override emit<TEventKey extends keyof BotEvents>(event: TEventKey, ...args: BotEvents[TEventKey]): boolean;

    override emit(event: string, ...args: unknown[]): boolean {
        return super.emit(event as never, ...(args as never));
    }
}
