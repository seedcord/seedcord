import { validateDiscordToken } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { ShutdownPhase } from '@seedcord/services';
import chalk from 'chalk';
import { Client, ClientEvents, Events, Interaction } from 'discord.js';
import { Envapt } from 'envapt/legacy';

import { CommandRegistry } from '@bControllers/CommandRegistry';
import { EventDispatcher } from '@bControllers/EventDispatcher';
import { InteractionDispatcher } from '@bControllers/InteractionDispatcher';
import { Plugin } from '@interfaces/Plugin';

import { CommandMentionInjector, CommandMentions } from './injectors/CommandMentionInjector';
import { EmojiInjector, Emojis } from './injectors/EmojiInjector';

import type { InjectedMentionMap } from './injectors/CommandMentionInjector';
import type { InjectedEmojiMap } from './injectors/EmojiInjector';
import type { Core } from '@interfaces/Core';
import type { HmrUpdateEvent } from '@seedcord/types';

/**
 * Types of events emitted by the {@link Core.bot} instance.
 */
export interface BotEvents {
    /** Emitted when an unhandled interaction error occurs */
    'error:unhandled:interaction': [error: Error];
    /** Emitted when an unhandled event error occurs */
    'error:unhandled:event': [error: Error];
    /** Emitted for any event */
    'any:event': { [K in keyof ClientEvents]: [K, ...ClientEvents[K]] }[keyof ClientEvents];
    /** Emitted for any interaction */
    'any:interaction': [interaction: Interaction];
    /** @internal */
    ready: [];
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
    private readonly interactions?: InteractionDispatcher;
    private readonly events?: EventDispatcher;
    public readonly commands?: CommandRegistry;
    private readonly emojiInjector: EmojiInjector;
    public readonly emojis: InjectedEmojiMap = Emojis;
    public readonly mentions: InjectedMentionMap = CommandMentions;

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
            this.interactions = new InteractionDispatcher(core);
        }
        if (core.config.bot.events.path) {
            this.events = new EventDispatcher(core);
        }

        if (core.config.bot.commands.path) {
            const mentionInjector = new CommandMentionInjector(core);
            this.commands = new CommandRegistry(core, (result) => {
                mentionInjector.inject(result);
            });
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

        await this.emojiInjector.init();

        if (this.commands) {
            await this.commands.init();
            await this.commands.setCommands();
            this.interactions?.warnUnhandledRoutes(this.commands.routeLeaves());
            this.interactions?.warnUnhandledContextMenuRoutes(this.commands.contextMenuLeaves());
        }
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
        this._client.once(Events.ClientReady, () => this.emit('ready'));
        void this._client.login(token);
        await this.waitFor('ready');
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
        // justified, TS cannot correlate the overload generics across super.emit.
        return super.emit(event as never, ...(args as never));
    }

    /** @internal */
    override emitSafe<TKey extends keyof ClientEvents>(
        event: 'any:event',
        name: TKey,
        ...args: ClientEvents[TKey]
    ): boolean;

    /** @internal */
    override emitSafe<TEventKey extends keyof BotEvents>(event: TEventKey, ...args: BotEvents[TEventKey]): boolean;

    override emitSafe(event: string, ...args: unknown[]): boolean {
        // justified, same forward as emit()
        return super.emitSafe(event as never, ...(args as never));
    }

    protected override onListenerError(error: unknown, event: string | symbol): void {
        this.logger.error(`listener for ${String(event)} threw`, error);
    }
}
