import { COMMAND_DEPLOY_TIMEOUT_MS, CommandRegistry, readBotToken } from '@seedcord/core/internal';
import { DRAIN_TASK_TIMEOUT_MS, DRAIN_WINDOW_MS, ShutdownPhase, StartupPhase } from '@seedcord/core/node/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { Client, Events } from 'discord.js';

import { EventDispatcher } from '#bControllers/EventDispatcher';
import { InteractionDispatcher } from '#bControllers/InteractionDispatcher';
import { assertGuildsIntent } from '#miscellaneous/assertGuildsIntent';

import { EmojiInjector } from './injectors/EmojiInjector';

import type { Core } from '#interfaces/Core';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { BitFieldResolvable, GatewayIntentsString } from 'discord.js';

const UNBIND_TIMEOUT_MS = 2000;
const LOGOUT_TIMEOUT_MS = 2000;

const loggerSlot = Symbol('seedcord:bot:logger');
const controllersSlot = Symbol('seedcord:bot:controllers');

interface Controllers {
    readonly interactions?: InteractionDispatcher | undefined;
    readonly events?: EventDispatcher | undefined;
    readonly commandRegistry?: CommandRegistry | undefined;
}

/**
 * The Discord client and its controllers. Access it through `core.bot`.
 */
export class Bot implements HmrAware {
    public get botToken(): string {
        return readBotToken().value;
    }

    readonly #logger = new Logger('Bot', { channel: 'bot' });

    /** @internal */
    readonly [loggerSlot]: Logger = this.#logger;
    #isInitialized = false;
    readonly #readyToDeploy = Promise.withResolvers<boolean>();

    readonly #intents: BitFieldResolvable<GatewayIntentsString, number>;
    readonly #client: Client;
    readonly #emojiInjector: EmojiInjector;
    readonly #interactions?: InteractionDispatcher;
    readonly #events?: EventDispatcher;
    readonly #commandRegistry?: CommandRegistry;

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (this.#interactions) await this.#interactions.onHmr(event);
        if (this.#events) await this.#events.onHmr(event);
        if (this.#commandRegistry) await this.#commandRegistry.onHmr(event);
    }

    /** @internal */
    constructor(core: Core) {
        this.#intents = core.config.bot.clientOptions.intents;
        this.#client = new Client(core.config.bot.clientOptions);

        if (core.config.bot.interactions.path) {
            this.#interactions = new InteractionDispatcher(core);
        }
        if (core.config.bot.events.path) {
            this.#events = new EventDispatcher(core);
        }

        if (core.config.bot.commands.path) this.#commandRegistry = new CommandRegistry(core);

        this.#emojiInjector = new EmojiInjector(core);

        this.#registerStartupTasks(core);
        this.#registerShutdownTasks(core);
    }

    /** @internal */
    public get [controllersSlot](): Controllers {
        return { interactions: this.#interactions, events: this.#events, commandRegistry: this.#commandRegistry };
    }

    /** @internal */
    public get applicationId(): string {
        const { application } = this.#client;
        if (!application) throw new SeedcordError(SeedcordErrorCode.CoreApplicationUnavailable);
        return application.id;
    }

    #registerStartupTasks(core: Core): void {
        core.startup.addTask(StartupPhase.Login, 'bot-initialization', async (signal) => {
            this.#logger.utils.initialization('Bot', 'start');
            await this.#init(signal);
            this.#logger.utils.initialization('Bot', 'end');
        });

        const registry = this.#commandRegistry;
        if (!registry) return;
        core.startup.addTask(
            StartupPhase.Login,
            'command-deploy',
            (signal) => this.#deployCommands(registry, signal),
            COMMAND_DEPLOY_TIMEOUT_MS
        );
    }

    #registerShutdownTasks(core: Core): void {
        core.shutdown.addTask(
            ShutdownPhase.Unbind,
            'stop-dispatch',
            () => {
                this.#stopAccepting();
                return Promise.resolve();
            },
            UNBIND_TIMEOUT_MS
        );
        core.shutdown.addTask(ShutdownPhase.Drain, 'drain-dispatch', () => this.#drain(), DRAIN_TASK_TIMEOUT_MS);
        core.shutdown.addTask(ShutdownPhase.Logout, 'stop-bot', async () => await this.#stop(), LOGOUT_TIMEOUT_MS);
    }

    #stopAccepting(): void {
        this.#interactions?.stopAccepting();
        this.#events?.stopAccepting();
    }

    async #drain(): Promise<void> {
        // runs through allSettled since a rejecting drain must not abort the other dispatcher's drain
        await Promise.allSettled([this.#interactions?.drain(DRAIN_WINDOW_MS), this.#events?.drain(DRAIN_WINDOW_MS)]);
    }

    async #init(signal: AbortSignal): Promise<void> {
        if (this.#isInitialized) {
            return;
        }
        this.#isInitialized = true;
        signal.addEventListener('abort', () => this.#readyToDeploy.resolve(false), { once: true });

        try {
            const token = this.botToken;

            if (this.#interactions) await this.#interactions.init();
            if (this.#events) await this.#events.init();

            await this.#login(token);
            await this.#emojiInjector.init();
        } catch (error) {
            this.#readyToDeploy.resolve(false);
            throw error;
        }
        this.#readyToDeploy.resolve(true);
    }

    async #deployCommands(registry: CommandRegistry, signal: AbortSignal): Promise<void> {
        // bot-initialization reports why it failed
        if (!(await this.#readyToDeploy.promise)) return;

        await registry.deploy(signal, {
            routes: this.#interactions,
            check: (commands) => assertGuildsIntent(this.#intents, commands)
        });
    }

    async #stop(): Promise<void> {
        this.#client.removeAllListeners();

        await this.#logout();
    }

    async #login(token: string): Promise<Bot> {
        const ready: PromiseWithResolvers<void> = Promise.withResolvers();
        this.#client.once(Events.ClientReady, () => ready.resolve());
        void this.#client.login(token);
        await ready.promise;
        this.#logger.info(`Logged in as ${paint.sky.bold(this.#client.user?.username)}!`);
        return this;
    }

    async #logout(): Promise<void> {
        await this.#client.destroy();
        this.#logger.info(paint.coral.bold('Logged out of Discord!'));
    }

    public get client(): Client {
        return this.#client;
    }
}

// the gateway integration tests call these off a live host
export function botLoggerOf(bot: Bot): Logger {
    return bot[loggerSlot];
}

export function interactionsOf(bot: Bot): InteractionDispatcher | undefined {
    return bot[controllersSlot].interactions;
}

export function eventsOf(bot: Bot): EventDispatcher | undefined {
    return bot[controllersSlot].events;
}

export function commandRegistryOf(bot: Bot): CommandRegistry | undefined {
    return bot[controllersSlot].commandRegistry;
}
