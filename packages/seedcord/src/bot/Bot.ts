import { Logger, ShutdownPhase } from '@seedcord/services';
import chalk from 'chalk';
import { Client } from 'discord.js';
import { Envapt } from 'envapt';

import { CommandRegistry } from '@bControllers/CommandRegistry';
import { EventController } from '@bControllers/EventController';
import { InteractionController } from '@bControllers/InteractionController';
import { Plugin } from '@interfaces/Plugin';

import { EmojiInjector } from './injectors/EmojiInjector';

import type { Core } from '@interfaces/Core';

/**
 * Discord bot implementation that manages client and controllers
 * @internal - Accessed via core.bot, not directly instantiated by users
 */
export class Bot extends Plugin {
    @Envapt<string>('DISCORD_BOT_TOKEN', {
        converter(raw, _fallback) {
            if (typeof raw !== 'string') throw new Error('Missing DISCORD_BOT_TOKEN');
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

    constructor(protected core: Core) {
        super(core);

        this._client = new Client(core.config.bot.clientOptions);

        this.interactions = new InteractionController(core);
        this.events = new EventController(core);

        this.commands = new CommandRegistry(this.core);
        this.emojiInjector = new EmojiInjector(this.core);

        this.core.shutdown.addTask(ShutdownPhase.DiscordCleanup, 'stop-bot', async () => await this.stop());
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

        await this.login();

        await this.interactions.init();
        await this.events.init();

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
}
