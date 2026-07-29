import { ShutdownPhase } from '@seedcord/core/node/internal';
import { validateDiscordToken } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import chalk from 'chalk';
import { Client, Events } from 'discord.js';
import { Envapt } from 'envapt/legacy';

import { CommandRegistry } from '@bControllers/CommandRegistry';
import { EventDispatcher } from '@bControllers/EventDispatcher';
import { InteractionDispatcher } from '@bControllers/InteractionDispatcher';

import { CommandMentionInjector, CommandMentions } from './injectors/CommandMentionInjector';
import { EmojiInjector, Emojis } from './injectors/EmojiInjector';

import type { InjectedMentionMap } from './injectors/CommandMentionInjector';
import type { InjectedEmojiMap } from './injectors/EmojiInjector';
import type { Core } from '@interfaces/Core';
import type { Initializeable } from '@seedcord/core';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';

const DISPATCH_DRAIN_TIMEOUT_MS = 5000;
// headroom so each dispatcher's own timer settles before the outer task timeout fires
const DRAIN_HEADROOM_MS = 1000;
const DRAIN_TASK_TIMEOUT_MS = DISPATCH_DRAIN_TIMEOUT_MS + DRAIN_HEADROOM_MS;
const UNBIND_TIMEOUT_MS = 2000;
const LOGOUT_TIMEOUT_MS = 2000;

/**
 * The Discord client and its controllers. Access it through `core.bot`.
 */
export class Bot implements Initializeable, HmrAware {
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
    private readonly emojiInjector: EmojiInjector;

    public readonly commands?: CommandRegistry;
    public readonly emojis: InjectedEmojiMap = Emojis;
    public readonly mentions: InjectedMentionMap = CommandMentions;

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (this.interactions) await this.interactions.onHmr(event);
        if (this.events) await this.events.onHmr(event);
        if (this.commands) await this.commands.onHmr(event);
    }

    /** @internal */
    constructor(core: Core) {
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

        this.registerShutdownTasks(core);
    }

    private registerShutdownTasks(core: Core): void {
        core.shutdown.addTask(
            ShutdownPhase.Unbind,
            'stop-dispatch',
            () => {
                this.stopAccepting();
                return Promise.resolve();
            },
            UNBIND_TIMEOUT_MS
        );
        core.shutdown.addTask(ShutdownPhase.Drain, 'drain-dispatch', () => this.drain(), DRAIN_TASK_TIMEOUT_MS);
        core.shutdown.addTask(ShutdownPhase.Logout, 'stop-bot', async () => await this.stop(), LOGOUT_TIMEOUT_MS);
    }

    private stopAccepting(): void {
        this.interactions?.stopAccepting();
        this.events?.stopAccepting();
    }

    private async drain(): Promise<void> {
        // allSettled so a rejecting drain does not abort the other dispatcher's drain
        await Promise.allSettled([
            this.interactions?.drain(DISPATCH_DRAIN_TIMEOUT_MS),
            this.events?.drain(DISPATCH_DRAIN_TIMEOUT_MS)
        ]);
    }

    /** @internal */
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

    /** @internal */
    public async stop(): Promise<void> {
        this._client.removeAllListeners();

        await this.logout();
    }

    private async login(token: string): Promise<Bot> {
        const ready: PromiseWithResolvers<void> = Promise.withResolvers();
        this._client.once(Events.ClientReady, () => ready.resolve());
        void this._client.login(token);
        await ready.promise;
        this.logger.info(`Logged in as ${chalk.bold.magenta(this._client.user?.username)}!`);
        return this;
    }

    private async logout(): Promise<void> {
        await this._client.destroy();
        this.logger.info(chalk.bold.red('Logged out of Discord!'));
    }

    public get client(): Client {
        return this._client;
    }
}
