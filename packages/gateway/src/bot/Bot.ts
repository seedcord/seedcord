import { CommandRegistry, ShutdownPhase } from '@seedcord/core/node/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { Client, Events } from 'discord.js';
import { Envapt } from 'envapt/legacy';

import { EventDispatcher } from '#bControllers/EventDispatcher';
import { InteractionDispatcher } from '#bControllers/InteractionDispatcher';
import { assertGuildsIntent } from '#miscellaneous/assertGuildsIntent';

import { EmojiInjector } from './injectors/EmojiInjector';

import type { Core } from '#interfaces/Core';
import type { Initializeable } from '@seedcord/core';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { BitFieldResolvable, GatewayIntentsString } from 'discord.js';

const DISPATCH_DRAIN_TIMEOUT_MS = 5000;
// leaves room for each dispatcher's own timer to settle before the outer timeout fires
const DRAIN_HEADROOM_MS = 1000;
const DRAIN_TASK_TIMEOUT_MS = DISPATCH_DRAIN_TIMEOUT_MS + DRAIN_HEADROOM_MS;
const UNBIND_TIMEOUT_MS = 2000;
const LOGOUT_TIMEOUT_MS = 2000;

const loggerSlot = Symbol('seedcord:bot:logger');

/**
 * The Discord client and its controllers. Access it through `core.bot`.
 */
export class Bot implements Initializeable, HmrAware {
    @Envapt<string>('DISCORD_BOT_TOKEN', {
        converter: (raw) => validateDiscordToken(raw)
    })
    declare public readonly botToken: string;

    private readonly logger = new Logger('Bot', { channel: 'bot' });

    /** @internal */
    readonly [loggerSlot]: Logger = this.logger;
    private isInitialized = false;

    private readonly intents: BitFieldResolvable<GatewayIntentsString, number>;
    private readonly _client: Client;
    private readonly interactions?: InteractionDispatcher;
    private readonly events?: EventDispatcher;
    private readonly emojiInjector: EmojiInjector;
    private readonly commandRegistry?: CommandRegistry;

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (this.interactions) await this.interactions.onHmr(event);
        if (this.events) await this.events.onHmr(event);
        if (this.commandRegistry) await this.commandRegistry.onHmr(event);
    }

    /** @internal */
    constructor(core: Core) {
        this.intents = core.config.bot.clientOptions.intents;
        this._client = new Client(core.config.bot.clientOptions);

        if (core.config.bot.interactions.path) {
            this.interactions = new InteractionDispatcher(core);
        }
        if (core.config.bot.events.path) {
            this.events = new EventDispatcher(core);
        }

        if (core.config.bot.commands.path) this.commandRegistry = new CommandRegistry(core);

        this.emojiInjector = new EmojiInjector(core);

        this.registerShutdownTasks(core);
    }

    /** @internal */
    public get applicationId(): string {
        const { application } = this._client;
        if (!application) throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable);
        return application.id;
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
        // runs through allSettled since a rejecting drain must not abort the other dispatcher's drain
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

        if (this.commandRegistry) {
            await this.commandRegistry.init();
            assertGuildsIntent(this.intents, this.commandRegistry.allCommands());
            await this.commandRegistry.setCommands();
            this.interactions?.warnUnhandledRoutes(this.commandRegistry.routeLeaves());
            this.interactions?.warnUnhandledContextMenuRoutes(this.commandRegistry.contextMenuLeaves());
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
        this.logger.info(`Logged in as ${paint.sky.bold(this._client.user?.username)}!`);
        return this;
    }

    private async logout(): Promise<void> {
        await this._client.destroy();
        this.logger.info(paint.coral.bold('Logged out of Discord!'));
    }

    public get client(): Client {
        return this._client;
    }
}

/** @internal */
export function botLoggerOf(bot: Bot): Logger {
    return bot[loggerSlot];
}
