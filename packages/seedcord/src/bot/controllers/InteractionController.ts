import { Logger } from '@seedcord/services';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, Events } from 'discord.js';

import { AutocompleteHandler, InteractionHandler, InteractionMiddleware } from '../../interfaces/Handler';
import { areRoutes } from '../../miscellaneous/areRoutes';
import { InteractionMetadataKey, InteractionRoutes } from '../decorators/Interactions';
import { MiddlewareMetadataKey, MiddlewareType } from '../decorators/Middlewares';
import { UnhandledEvent } from '../defaults/UnhandledEvent';
import { buildSlashRoute } from '../utilities/miscellaneous/buildSlashRoute';

import type { Core } from '../../interfaces/Core';
import type { HandlerConstructor, InteractionMiddlewareConstructor, Repliables } from '../../interfaces/Handler';
import type { Initializeable } from '../../interfaces/Plugin';
import type { MiddlewareMetadata } from '../decorators/Middlewares';
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
export class InteractionController implements Initializeable {
    private readonly logger = new Logger('Interactions');
    private isInitialized = false;

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

    private readonly keysToIgnore = new Set<string>();

    private readonly middlewares: RegisteredMiddleware[] = [];

    constructor(protected core: Core) {
        // Add ignored keys from config
        const ignoredKeysFromConfig = this.core.config.bot.interactions.ignoreCustomIds;
        if (ignoredKeysFromConfig) {
            for (const ignoredKey of ignoredKeysFromConfig) this.keysToIgnore.add(ignoredKey);
        }
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        this.isInitialized = true;

        const handlersDir = this.core.config.bot.interactions.path;
        this.logger.info(chalk.bold(handlersDir));

        const middlewareDir = this.core.config.bot.interactions.middlewares;
        if (middlewareDir) {
            this.logger.info(`${chalk.bold(middlewareDir)} ${chalk.gray('(middlewares)')}`);
            await this.loadMiddlewares(middlewareDir);
        }

        await this.loadHandlers(handlersDir);
        this.attachToClient();

        this.logger.info(`${chalk.bold.green('Loaded interaction handlers:')}`);
        this.logger.info(`→ ${chalk.magenta.bold(this.middlewares.length)} middlewares`);
        this.logger.info(`→ ${chalk.magenta.bold(this.slashMap.size)} slash commands`);
        this.logger.info(`→ ${chalk.magenta.bold(this.buttonMap.size)} buttons`);
        this.logger.info(`→ ${chalk.magenta.bold(this.modalMap.size)} modals`);
        this.logger.info(`→ ${chalk.magenta.bold(this.stringSelectMap.size)} string selects`);
        this.logger.info(`→ ${chalk.magenta.bold(this.userSelectMap.size)} user selects`);
        this.logger.info(`→ ${chalk.magenta.bold(this.roleSelectMap.size)} role selects`);
        this.logger.info(`→ ${chalk.magenta.bold(this.channelSelectMap.size)} channel selects`);
        this.logger.info(`→ ${chalk.magenta.bold(this.mentionableSelectMap.size)} mentionable selects`);
        this.logger.info(`→ ${chalk.magenta.bold(this.messageContextMenuMap.size)} message context menus`);
        this.logger.info(`→ ${chalk.magenta.bold(this.userContextMenuMap.size)} user context menus`);
        this.logger.info(`→ ${chalk.magenta.bold(this.autocompleteMap.size)} autocomplete`);
    }

    private async loadHandlers(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (_fullPath, relativePath, imported) => {
                for (const val of Object.values(imported)) {
                    if (!this.isHandlerClass(val)) continue;
                    this.registerHandler(val);
                    this.logger.info(
                        `${chalk.italic('Registered')} ${chalk.bold.yellow(val.name)} from ${chalk.gray(relativePath)}`
                    );
                }
            },
            this.logger
        );
    }

    private async loadMiddlewares(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (_fullPath, relativePath, imported) => {
                for (const val of Object.values(imported)) {
                    if (!this.isMiddlewareClass(val)) continue;
                    const metadata = Reflect.getMetadata(MiddlewareMetadataKey, val) as MiddlewareMetadata | undefined;
                    if (metadata?.type !== MiddlewareType.Interaction) continue;

                    this.registerMiddleware(val, metadata, relativePath);
                }
            },
            this.logger
        );
    }

    private registerMiddleware(
        middlewareCtor: InteractionMiddlewareConstructor,
        metadata: MiddlewareMetadata,
        relativePath: string
    ): void {
        const alreadyRegistered = this.middlewares.some((entry) => entry.ctor === middlewareCtor);
        if (alreadyRegistered) return;

        this.middlewares.push({ ctor: middlewareCtor, priority: metadata.priority });
        this.middlewares.sort((a, b) => a.priority - b.priority);

        this.logger.info(
            `${chalk.italic('Registered middleware')} ${chalk.bold.yellow(middlewareCtor.name)} ${chalk.gray(`(priority ${metadata.priority})`)} from ${chalk.gray(relativePath)}`
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

    private registerHandler(handlerClass: HandlerConstructor): void {
        const routeTypes: [InteractionRoutes, Collection<string, HandlerConstructor>][] = [
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
        for (const [routeType, map] of routeTypes) {
            const meta: unknown = Reflect.getMetadata(routeType, handlerClass);
            if (!areRoutes(meta)) continue;

            const routes = meta;
            routes.forEach((route) => map.set(route, handlerClass));
        }
    }

    private attachToClient(): void {
        this.core.bot.client.on(Events.InteractionCreate, (interaction) => {
            this.handleInteraction(interaction).catch((err: Error) => {
                this.logger.error(`[${chalk.bold.red('UNHANDLED ERROR AT ROOT')}] ${err.name}`, err.stack);
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
        if (this.keysToIgnore.has(key)) return;

        // Run middlewares first
        for (const { ctor } of this.middlewares) {
            const middleware = new ctor(interaction as Repliables, this.core, args);
            if (middleware.hasChecks()) await middleware.runChecks();
            if (middleware.shouldBreak() || middleware.hasErrors()) return;

            await middleware.execute();
            if (middleware.shouldBreak() || middleware.hasErrors()) return;
        }
        let HandlerCtor = getHandler(key);
        if (!HandlerCtor) {
            // Automatically fallback to UnhandledEvent
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
