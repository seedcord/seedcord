/* eslint-disable max-lines -- one handler method per interaction type keeps the router in one file */
import {
    InteractionMetadataKey,
    InteractionRouteKeys,
    InteractionRoutes,
    MiddlewareMetadataKey,
    prefixOf
} from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/services';
import { formatFilePath, hasKeys, traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Events } from 'discord.js';
import { Envapter } from 'envapt';

import { runHandlerGates } from '@bDecorators/Gated';
import { MiddlewareType } from '@bDecorators/Middlewares';
import { CONFIRM_DEF } from '@bot/confirm/reserved';
import { UnhandledEvent } from '@bot/defaults';
import { interactionGateContext } from '@bot/gates/runGates';
import { handleInteractionFault } from '@bot/handleInteractionFault';
import { slashRouteOf } from '@bUtilities/miscellaneous/slashRouteOf';
import { AutocompleteHandler, InteractionMiddleware } from '@handlers/interaction';
import { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import { HmrModuleHandler } from '@hmr/HmrModuleHandler';
import { areRoutes } from '@miscellaneous/areRoutes';

import type { MiddlewareMetadata } from '@bDecorators/Middlewares';
import type { ContextMenuLeaves } from '@bUtilities/miscellaneous/contextMenuLeaves';
import type { Repliables, ValidInteractionTypes } from '@handlers/BaseHandler';
import type { HandlerConstructor, InteractionMiddlewareConstructor } from '@handlers/constructors';
import type { Core } from '@interfaces/Core';
import type { Initializeable } from '@interfaces/Plugin';
import type { CustomIdMatcher } from '@seedcord/types';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types/internal';
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
 * Scans handler directories, routes each interaction to its registered handler, and runs the handler.
 * One handler per interaction.
 *
 * @internal
 */
export class InteractionDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Interactions');
    private isInitialized = false;

    public readonly name: string = 'Interactions';

    private readonly slashMap = new Map<string, HandlerConstructor>();
    private readonly buttonMap = new Map<string, HandlerConstructor>();
    private readonly modalMap = new Map<string, HandlerConstructor>();
    private readonly stringSelectMap = new Map<string, HandlerConstructor>();
    private readonly userSelectMap = new Map<string, HandlerConstructor>();
    private readonly roleSelectMap = new Map<string, HandlerConstructor>();
    private readonly channelSelectMap = new Map<string, HandlerConstructor>();
    private readonly mentionableSelectMap = new Map<string, HandlerConstructor>();
    private readonly messageContextMenuMap = new Map<string, HandlerConstructor>();
    private readonly userContextMenuMap = new Map<string, HandlerConstructor>();
    private readonly autocompleteMap = new Map<string, HandlerConstructor>();

    private readonly keysToIgnore = new Set<CustomIdMatcher>();
    private readonly middlewares: RegisteredMiddleware[] = [];

    private readonly hmrHandler?: HmrModuleHandler<
        HandlerConstructor,
        InteractionMiddlewareConstructor,
        InteractionArtifact[]
    >;

    private readonly routeTypes: [InteractionRoutes, Map<string, HandlerConstructor>][] = [
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

        // the in-process getConfirmation() collector consumes these clicks, so ignore them here or the global
        // router double-acks them.
        this.keysToIgnore.add(CONFIRM_DEF);

        const interactionsDir = this.core.config.bot.interactions.path;
        if (!interactionsDir) {
            // unreachable today, guards against a path regression
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, [
                'InteractionDispatcher',
                'interactions'
            ]);
        }

        if (!Envapter.isDevelopment && !Envapter.isTest) return;
        this.hmrHandler = new HmrModuleHandler({
            handlersDir: interactionsDir,
            ...(hasKeys(this.core.config.bot.interactions, ['middlewares']) &&
                this.core.config.bot.interactions.middlewares && {
                    middlewaresDir: this.core.config.bot.interactions.middlewares
                }),
            isHandler: this.isHandlerClass.bind(this),
            isMiddleware: this.isMiddlewareClass.bind(this),
            registerHandler: this.registerHandler.bind(this),
            registerMiddleware: this.registerMiddleware.bind(this),
            unregisterHandler: this.unregisterHandler.bind(this),
            unregisterMiddleware: this.unregisterMiddleware.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger
        });
    }

    /**
     * Warns for each command route with no registered `@SlashRoute` handler, which would fall through to
     * UnhandledEvent at runtime. A bot may route commands outside the registry, so this does not throw.
     *
     * @internal
     */
    public warnUnhandledRoutes(commandLeaves: Iterable<string>): void {
        for (const route of commandLeaves) {
            if (!this.slashMap.has(route)) {
                this.logger.warn(
                    `Slash route ${chalk.bold.cyan(route)} has no registered ${chalk.bold('@SlashRoute')} handler.`
                );
            }
        }
    }

    /**
     * Warns for each context-menu command with no matching handler, which would fall through to UnhandledEvent
     * at runtime. Checked per kind since a user and a message command can share a name.
     *
     * @internal
     */
    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        for (const name of leaves.user) {
            if (!this.userContextMenuMap.has(name)) {
                this.logger.warn(
                    `User context menu ${chalk.bold.cyan(name)} has no registered ${chalk.bold('@ContextMenuRoute')} handler.`
                );
            }
        }
        for (const name of leaves.message) {
            if (!this.messageContextMenuMap.has(name)) {
                this.logger.warn(
                    `Message context menu ${chalk.bold.cyan(name)} has no registered ${chalk.bold('@ContextMenuRoute')} handler.`
                );
            }
        }
    }

    private getArtifacts(handlerClass: HandlerConstructor): InteractionArtifact[] {
        const artifacts: InteractionArtifact[] = [];
        for (const [routeType] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[routeType], handlerClass);
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

        // same class re-registered (double import or an HMR re-scan) is idempotent, matching event middleware
        if (this.middlewares.some((entry) => entry.ctor === middlewareCtor)) return;

        // a different class sharing the name would silently overwrite the first, so this throws to surface it
        if (this.middlewares.some((entry) => entry.ctor.name === middlewareCtor.name)) {
            throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateMiddleware, [middlewareCtor.name]);
        }

        this.middlewares.push({ ctor: middlewareCtor, priority: metadata.priority });
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
        // a partial registration would orphan routes and break hmr rollback
        const writes: [Map<string, HandlerConstructor>, string][] = [];

        for (const [routeType, map] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[routeType], handlerClass);
            if (!areRoutes(meta)) continue;

            for (const route of meta) {
                const existing = map.get(route);
                // a different class on the same route would silently shadow (last write wins), so this throws
                if (existing && existing !== handlerClass) {
                    throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateRoute, [
                        route,
                        existing.name,
                        handlerClass.name
                    ]);
                }
                writes.push([map, route]);
            }

            this.logger.utils.registration(handlerClass.name, formatFilePath(relativePath));
        }

        for (const [map, route] of writes) map.set(route, handlerClass);
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
            const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[routeType], handlerClass);
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

    private async handleCustomIdInteraction<TInteraction extends Interaction & { customId: string }>(
        interaction: TInteraction,
        getMap: () => Map<string, HandlerConstructor>,
        interactionType: string
    ): Promise<void> {
        if ([...this.keysToIgnore].some((matcher) => matcher.owns(interaction.customId))) return;

        // route by the stable prefix (the routeKey minus its shape hash) so an older-shape wire still
        // reaches its handler, where reading this.params throws StaleCustomId and the boundary replies.
        const prefix = prefixOf(interaction.customId);
        if (!prefix) return this.logger.warn(`${interactionType} has invalid customId: ${interaction.customId}`);

        await this.processInteraction(
            interaction,
            () => prefix,
            (key) => getMap().get(key)
        );
    }

    private async processInteraction<TInteraction extends Interaction>(
        interaction: TInteraction,
        extractKey: (i: TInteraction) => string,
        getHandler: (key: string) => HandlerConstructor | undefined
    ): Promise<void> {
        const key = extractKey(interaction);

        try {
            if (!interaction.isAutocomplete()) {
                for (const { ctor } of this.middlewares) {
                    const middleware = new ctor(interaction as Repliables, this.core);
                    await middleware.execute();
                }
            }

            let HandlerCtor = getHandler(key);
            if (!HandlerCtor) {
                this.logger.warn(`No handler found for key ${chalk.bold.cyan(key)}. Falling back to UnhandledEvent.`);
                HandlerCtor = UnhandledEvent;
            }

            this.logger.debug(`Processing ${chalk.bold.green(key)} with ${chalk.gray(HandlerCtor.name)}`);
            // @ts-expect-error TS can't infer the type of interaction here
            const handler = new HandlerCtor(interaction as Repliables, this.core);
            if (!interaction.isAutocomplete()) {
                await runHandlerGates(HandlerCtor, interactionGateContext(interaction as Repliables, this.core));
            }
            await handler.execute();
        } catch (caught) {
            await handleInteractionFault(caught, interaction as ValidInteractionTypes, this.core);
        }
    }

    private async handleInteraction(interaction: Interaction): Promise<void> {
        switch (true) {
            case interaction.isChatInputCommand(): {
                await this.handleSlashCommand(interaction);
                break;
            }
            case interaction.isButton(): {
                await this.handleButton(interaction);
                break;
            }
            case interaction.isModalSubmit(): {
                await this.handleModal(interaction);
                break;
            }
            case interaction.isStringSelectMenu(): {
                await this.handleStringSelectMenu(interaction);
                break;
            }
            case interaction.isUserSelectMenu(): {
                await this.handleUserSelectMenu(interaction);
                break;
            }
            case interaction.isRoleSelectMenu(): {
                await this.handleRoleSelectMenu(interaction);
                break;
            }
            case interaction.isChannelSelectMenu(): {
                await this.handleChannelSelectMenu(interaction);
                break;
            }
            case interaction.isMentionableSelectMenu(): {
                await this.handleMentionableSelectMenu(interaction);
                break;
            }
            case interaction.isMessageContextMenuCommand(): {
                await this.handleMessageContextMenu(interaction);
                break;
            }
            case interaction.isUserContextMenuCommand(): {
                await this.handleUserContextMenu(interaction);
                break;
            }
            case interaction.isAutocomplete(): {
                await this.handleAutocomplete(interaction);
                break;
            }
            default: {
                this.logger.warn(`Unhandled interaction type: ${interaction.type}`);
                break;
            }
        }
    }

    private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const route = slashRouteOf(interaction);
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
        const route = slashRouteOf(interaction);

        if (!this.autocompleteMap.has(route)) {
            this.logger.warn(`No autocomplete handler for ${chalk.bold.cyan(route)}.`);
            await interaction.respond([]);
            return;
        }

        await this.processInteraction(
            interaction,
            () => route,
            (key) => this.autocompleteMap.get(key)
        );
    }
}
