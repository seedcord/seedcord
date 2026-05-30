/* eslint-disable max-lines */
import { Logger, SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { formatFilePath, hasKeys, traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, Events } from 'discord.js';
import { Envapter } from 'envapt';

import { InteractionMetadataKey, InteractionRoutes } from '@bDecorators/Interactions';
import { MiddlewareMetadataKey, MiddlewareType } from '@bDecorators/Middlewares';
import { UnhandledEvent } from '@bot/defaults';
import { buildSlashRoute } from '@bUtilities/miscellaneous/buildSlashRoute';
import { HmrModuleHandler } from '@hmr/HmrModuleHandler';
import { AutocompleteHandler, InteractionHandler, InteractionMiddleware } from '@interfaces/Handler';
import { areRoutes } from '@miscellaneous/areRoutes';

import type { MiddlewareMetadata } from '@bDecorators/Middlewares';
import type { Core } from '@interfaces/Core';
import type { HandlerConstructor, InteractionMiddlewareConstructor, Repliables } from '@interfaces/Handler';
import type { Initializeable } from '@interfaces/Plugin';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/cli';
import type {
    AutocompleteInteraction,
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    ChatInputCommandInteraction,
    Interaction,
    MentionableSelectMenuInteraction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserContextMenuCommandInteraction,
    UserSelectMenuInteraction
} from 'discord.js';

interface InteractionArtifact {
    routeType: InteractionRoutes;
    routes: string[];
}

interface RegisteredMiddleware {
    readonly ctor: InteractionMiddlewareConstructor;
    readonly priority: number;
}

/**
 * Manages Discord interaction handling and routing.
 *
 * Scans handler directories, registers handlers with Discord client events,
 * and coordinates event execution through the handler system. Only handles interactions.
 *
 * Enforces that there is only one handler per interaction.
 *
 * @internal
 */
export class InteractionController implements Initializeable, HmrAware {
    private readonly logger = new Logger('Interactions');
    private isInitialized = false;

    public readonly name: string = 'Interactions';

    private readonly slashMap = new Collection<string, HandlerConstructor>();
    private readonly buttonMap = new Collection<string, HandlerConstructor>();
    private readonly modalMap = new Collection<string, HandlerConstructor>();
    private readonly stringSelectMap = new Collection<string, HandlerConstructor>();
    private readonly userSelectMap = new Collection<string, HandlerConstructor>();
    private readonly roleSelectMap = new Collection<string, HandlerConstructor>();
    private readonly channelSelectMap = new Collection<string, HandlerConstructor>();
    private readonly mentionableSelectMap = new Collection<string, HandlerConstructor>();
    private readonly messageContextMenuMap = new Collection<string, HandlerConstructor>();
    private readonly userContextMenuMap = new Collection<string, HandlerConstructor>();
    private readonly autocompleteMap = new Collection<string, HandlerConstructor>();

    private readonly keysToIgnore = new Set<string | RegExp>();

    private readonly middlewares: RegisteredMiddleware[] = [];

    private readonly hmrHandler?: HmrModuleHandler<
        HandlerConstructor,
        InteractionMiddlewareConstructor,
        InteractionArtifact[]
    >;

    private readonly routeTypes: [InteractionRoutes, Collection<string, HandlerConstructor>][] = [
        [InteractionRoutes.Slash, this.slashMap],
        [InteractionRoutes.Button, this.buttonMap],
        [InteractionRoutes.Modal, this.modalMap],
        [InteractionRoutes.StringMenu, this.stringSelectMap],
        [InteractionRoutes.UserMenu, this.userSelectMap],
        [InteractionRoutes.RoleMenu, this.roleSelectMap],
        [InteractionRoutes.ChannelMenu, this.channelSelectMap],
        [InteractionRoutes.MentionableMenu, this.mentionableSelectMap],
        [InteractionRoutes.MessageContextMenu, this.messageContextMenuMap],
        [InteractionRoutes.UserContextMenu, this.userContextMenuMap],
        [InteractionRoutes.Autocomplete, this.autocompleteMap]
    ];

    constructor(protected core: Core) {
        const ignoredKeysFromConfig = hasKeys(this.core.config.bot.interactions, ['ignoreCustomIds'])
            ? this.core.config.bot.interactions.ignoreCustomIds
            : undefined;
        if (ignoredKeysFromConfig) {
            for (const ignoredKey of ignoredKeysFromConfig) this.keysToIgnore.add(ignoredKey);
        }

        const interactionsDir = this.core.config.bot.interactions.path;
        if (!interactionsDir) {
            // Unreachable: InteractionController is only constructed when path is set. Throw rather than no-op so a regression in the caller surfaces instead of silently skipping handler loading.
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, [
                'InteractionController',
                'interactions'
            ]);
        }

        if (!Envapter.isDevelopment) return; // HMR only in development
        this.hmrHandler = new HmrModuleHandler({
            handlersDir: interactionsDir,
            ...(hasKeys(this.core.config.bot.interactions, ['middlewares']) &&
            this.core.config.bot.interactions.middlewares
                ? { middlewaresDir: this.core.config.bot.interactions.middlewares }
                : {}),
            isHandler: this.isHandlerClass.bind(this),
            isMiddleware: this.isMiddlewareClass.bind(this),
            registerHandler: this.registerHandler.bind(this),
            registerMiddleware: this.registerMiddleware.bind(this),
            unregisterHandler: this.unregisterHandler.bind(this),
            unregisterMiddleware: this.unregisterMiddleware.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger,
            name: 'Interaction'
        });
    }

    private getArtifacts(handlerClass: HandlerConstructor): InteractionArtifact[] {
        const artifacts: InteractionArtifact[] = [];
        for (const [routeType] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(routeType, handlerClass);
            if (areRoutes(meta)) artifacts.push({ routeType, routes: meta });
        }
        return artifacts;
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        this.isInitialized = true;

        const handlersDir = this.core.config.bot.interactions.path;
        // Already checked in constructor
        if (!handlersDir) return;

        this.logger.info(chalk.bold(handlersDir));

        const middlewareDir = hasKeys(this.core.config.bot.interactions, ['middlewares'])
            ? this.core.config.bot.interactions.middlewares
            : undefined;
        if (middlewareDir) {
            this.logger.info(`${chalk.bold(middlewareDir)} ${chalk.gray('(middlewares)')}`);
            await this.loadMiddlewares(middlewareDir);
        }

        await this.loadHandlers(handlersDir);
        this.attachToClient();

        this.logger.info(`${chalk.bold.green('Loaded interaction handlers:')}`);
        this.logger.utils.list([
            `${chalk.magenta.bold(this.middlewares.length)} middlewares`,
            `${chalk.magenta.bold(this.slashMap.size)} slash commands`,
            `${chalk.magenta.bold(this.buttonMap.size)} buttons`,
            `${chalk.magenta.bold(this.modalMap.size)} modals`,
            `${chalk.magenta.bold(this.stringSelectMap.size)} string selects`,
            `${chalk.magenta.bold(this.userSelectMap.size)} user selects`,
            `${chalk.magenta.bold(this.roleSelectMap.size)} role selects`,
            `${chalk.magenta.bold(this.channelSelectMap.size)} channel selects`,
            `${chalk.magenta.bold(this.mentionableSelectMap.size)} mentionable selects`,
            `${chalk.magenta.bold(this.messageContextMenuMap.size)} message context menus`,
            `${chalk.magenta.bold(this.userContextMenuMap.size)} user context menus`,
            `${chalk.magenta.bold(this.autocompleteMap.size)} autocomplete`
        ]);
    }

    private async loadHandlers(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (fullPath, relativePath, imported) => {
                for (const val of Object.values(imported)) {
                    if (!this.isHandlerClass(val)) continue;
                    this.registerHandler(val, relativePath);
                    this.hmrHandler?.trackHandler(fullPath, val);
                }
            },
            this.logger
        );
    }

    private async loadMiddlewares(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (fullPath, relativePath, imported) => {
                for (const val of Object.values(imported)) {
                    if (!this.isMiddlewareClass(val)) continue;

                    this.registerMiddleware(val, relativePath);
                    this.hmrHandler?.trackMiddleware(fullPath, val);
                }
            },
            this.logger
        );
    }

    private registerMiddleware(middlewareCtor: InteractionMiddlewareConstructor, relativePath: string): void {
        const metadata = Reflect.getMetadata(MiddlewareMetadataKey, middlewareCtor) as MiddlewareMetadata | undefined;
        if (metadata?.type !== MiddlewareType.Interaction) return;

        const existingIndex = this.middlewares.findIndex((entry) => entry.ctor.name === middlewareCtor.name);

        if (existingIndex !== -1) {
            this.middlewares[existingIndex] = { ctor: middlewareCtor, priority: metadata.priority };
        } else {
            this.middlewares.push({ ctor: middlewareCtor, priority: metadata.priority });
        }

        this.middlewares.sort((a, b) => a.priority - b.priority);

        this.logger.utils.registration(
            `${middlewareCtor.name} ${chalk.gray(`(${metadata.priority})`)}`,
            relativePath,
            'middleware'
        );
    }

    private isHandlerClass(obj: unknown): obj is HandlerConstructor {
        if (typeof obj !== 'function') return false;
        return (
            (obj.prototype instanceof InteractionHandler && Reflect.hasMetadata(InteractionMetadataKey, obj)) ||
            (obj.prototype instanceof AutocompleteHandler && Reflect.hasMetadata(InteractionMetadataKey, obj))
        );
    }

    private isMiddlewareClass(obj: unknown): obj is InteractionMiddlewareConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof InteractionMiddleware && Reflect.hasMetadata(MiddlewareMetadataKey, obj);
    }

    private registerHandler(handlerClass: HandlerConstructor, relativePath: string): void {
        for (const [routeType, map] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(routeType, handlerClass);
            if (!areRoutes(meta)) continue;

            const routes = meta;
            routes.forEach((route) => map.set(route, handlerClass));

            this.logger.utils.registration(handlerClass.name, formatFilePath(relativePath));
        }
    }

    /** @internal For use in dev mode */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    private unregisterHandler(handlerClass: HandlerConstructor, artifacts?: InteractionArtifact[]): void {
        if (artifacts) {
            for (const { routeType, routes } of artifacts) {
                const map = this.routeTypes.find(([type]) => type === routeType)?.[1];
                if (map) {
                    routes.forEach((route) => map.delete(route));
                }
            }
            return;
        }

        for (const [routeType, map] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(routeType, handlerClass);
            if (!areRoutes(meta)) continue;

            const routes = meta;
            routes.forEach((route) => map.delete(route));
        }
    }

    private unregisterMiddleware(middlewareCtor: InteractionMiddlewareConstructor): void {
        const index = this.middlewares.findIndex((entry) => entry.ctor === middlewareCtor);
        if (index !== -1) {
            this.middlewares.splice(index, 1);
        }
    }

    private attachToClient(): void {
        this.core.bot.client.on(Events.InteractionCreate, (interaction) => {
            this.core.bot.emit('any:interaction', interaction);
            this.handleInteraction(interaction).catch((err: Error) => {
                this.logger.error(`[${chalk.bold.red('UNHANDLED ERROR AT ROOT')}] ${err.name}`, err.stack);
                this.core.bot.emit('error:unhandled:interaction', err);
            });
        });
    }

    private parseCustomId(customId: string): { prefix: string; args: string[] } {
        const parts = customId.split(':');
        const prefix = parts[0] ?? '';
        const argString = parts[1] ?? '';
        const args = argString ? argString.split('-') : [];

        return { prefix, args };
    }

    private async handleCustomIdInteraction<TInteraction extends Interaction & { customId: string }>(
        interaction: TInteraction,
        getMap: () => Collection<string, HandlerConstructor>,
        interactionType: string
    ): Promise<void> {
        const { prefix, args } = this.parseCustomId(interaction.customId);
        if (!prefix) return this.logger.warn(`${interactionType} has invalid customId: ${interaction.customId}`);

        await this.processInteraction(
            interaction,
            () => prefix,
            (key) => getMap().get(key),
            args
        );
    }

    public async processInteraction<TInteraction extends Interaction>(
        interaction: TInteraction,
        extractKey: (i: TInteraction) => string,
        getHandler: (key: string) => HandlerConstructor | undefined,
        args?: string[]
    ): Promise<void> {
        const key = extractKey(interaction);
        if (
            [...this.keysToIgnore].some((pattern) =>
                typeof pattern === 'string' ? pattern === key : pattern.test(key)
            )
        ) {
            return;
        }

        // Autocomplete interactions skip middlewares.
        if (!interaction.isAutocomplete()) {
            for (const { ctor } of this.middlewares) {
                const middleware = new ctor(interaction as Repliables, this.core, args);
                if (middleware.hasChecks()) await middleware.runChecks();
                if (middleware.shouldBreak() || middleware.hasErrors()) return;

                await middleware.execute();
                if (middleware.shouldBreak() || middleware.hasErrors()) return;
            }
        }

        let HandlerCtor = getHandler(key);
        if (!HandlerCtor) {
            this.logger.warn(`No handler found for key ${chalk.bold.cyan(key)}. Falling back to UnhandledEvent.`);
            HandlerCtor = UnhandledEvent;
        }

        this.logger.debug(`Processing ${chalk.bold.green(key)} with ${chalk.gray(HandlerCtor.name)}`);
        // @ts-expect-error TS can't infer the type of interaction here
        const handler = new HandlerCtor(interaction as Repliables, this.core, args);
        if (handler.hasChecks()) await handler.runChecks();
        if (handler.shouldBreak()) return;
        if (!handler.hasErrors()) await handler.execute();
    }

    private async handleInteraction(interaction: Interaction): Promise<void> {
        switch (true) {
            case interaction.isChatInputCommand():
                await this.handleSlashCommand(interaction);
                break;
            case interaction.isButton():
                await this.handleButton(interaction);
                break;
            case interaction.isModalSubmit():
                await this.handleModal(interaction);
                break;
            case interaction.isStringSelectMenu():
                await this.handleStringSelectMenu(interaction);
                break;
            case interaction.isUserSelectMenu():
                await this.handleUserSelectMenu(interaction);
                break;
            case interaction.isRoleSelectMenu():
                await this.handleRoleSelectMenu(interaction);
                break;
            case interaction.isChannelSelectMenu():
                await this.handleChannelSelectMenu(interaction);
                break;
            case interaction.isMentionableSelectMenu():
                await this.handleMentionableSelectMenu(interaction);
                break;
            case interaction.isMessageContextMenuCommand():
                await this.handleMessageContextMenu(interaction);
                break;
            case interaction.isUserContextMenuCommand():
                await this.handleUserContextMenu(interaction);
                break;
            case interaction.isAutocomplete():
                await this.handleAutocomplete(interaction);
                break;
            default:
                this.logger.warn(`Unhandled interaction type: ${interaction.type}`);
                break;
        }
    }

    private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const route = buildSlashRoute(interaction);
        await this.processInteraction(
            interaction,
            () => route,
            (key) => this.slashMap.get(key)
        );
    }

    private async handleButton(interaction: ButtonInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, () => this.buttonMap, 'Button');
    }

    private async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, () => this.modalMap, 'Modal');
    }

    private async handleStringSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, () => this.stringSelectMap, 'String select menu');
    }

    private async handleUserSelectMenu(interaction: UserSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, () => this.userSelectMap, 'User select menu');
    }

    private async handleRoleSelectMenu(interaction: RoleSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, () => this.roleSelectMap, 'Role select menu');
    }

    private async handleChannelSelectMenu(interaction: ChannelSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, () => this.channelSelectMap, 'Channel select menu');
    }

    private async handleMentionableSelectMenu(interaction: MentionableSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, () => this.mentionableSelectMap, 'Mentionable select menu');
    }

    private async handleMessageContextMenu(interaction: MessageContextMenuCommandInteraction): Promise<void> {
        await this.processInteraction(
            interaction,
            () => interaction.commandName,
            (key) => this.messageContextMenuMap.get(key)
        );
    }

    private async handleUserContextMenu(interaction: UserContextMenuCommandInteraction): Promise<void> {
        await this.processInteraction(
            interaction,
            () => interaction.commandName,
            (key) => this.userContextMenuMap.get(key)
        );
    }

    private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const route = buildSlashRoute(interaction);
        const focused = interaction.options.getFocused(true);
        const autocompleteKey = `${route}:${focused.name}`;

        await this.processInteraction(
            interaction,
            () => autocompleteKey,
            (key) => this.autocompleteMap.get(key)
        );
    }
}
