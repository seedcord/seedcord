import { Logger } from '@seedcord/services';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Events } from 'discord.js';

import { AutocompleteHandler, InteractionHandler } from '../../interfaces/Handler';
import { InteractionMetadataKey, InteractionRoutes } from '../decorators/InteractionConfigurable';
import { UnhandledEvent } from '../defaults/UnhandledEvent';

import type { Core } from '../../interfaces/Core';
import type { HandlerConstructor, MiddlewareConstructor, Repliables } from '../../interfaces/Handler';
import type { Initializeable } from '../../interfaces/Plugin';
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

  private readonly keysToIgnore = new Set(['confirm!confirmable', 'cancel!confirmable']);

  private readonly middlewares: MiddlewareConstructor[] = [];

  constructor(protected core: Core) {}

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    this.isInitialized = true;

    const handlersDir = this.core.config.bot.interactions.path;
    this.logger.info(chalk.bold(handlersDir));

    await this.loadHandlers(handlersDir);
    this.attachToClient();

    this.logger.info(`${chalk.bold.green('Loaded interaction handlers:')}`);
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
          if (this.isHandlerClass(val)) {
            this.registerHandler(val);
            this.logger.info(
              `${chalk.italic('Registered')} ${chalk.bold.yellow(val.name)} from ${chalk.gray(relativePath)}`
            );
          }
        }
      },
      this.logger
    );
  }

  private isHandlerClass(obj: unknown): obj is HandlerConstructor {
    if (typeof obj !== 'function') return false;
    return (
      (obj.prototype instanceof InteractionHandler && Reflect.hasMetadata(InteractionMetadataKey, obj)) ||
      (obj.prototype instanceof AutocompleteHandler && Reflect.hasMetadata(InteractionMetadataKey, obj))
    );
  }

  private registerHandler(handlerClass: HandlerConstructor): void {
    const areRoutes = (routes: unknown): routes is string[] => {
      return Array.isArray(routes) && routes.every((r) => typeof r === 'string');
    };

    const routeTypes: [InteractionRoutes, Map<string, HandlerConstructor>][] = [
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
    getMap: () => Map<string, HandlerConstructor>,
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
    for (const MiddlewareCtor of this.middlewares) {
      const middleware = new MiddlewareCtor(interaction as Repliables, this.core, args);
      await middleware.execute();
      if (middleware.hasErrors()) return;
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
    const route = this.buildSlashRoute(interaction);
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
    const route = this.buildSlashRoute(interaction);
    const focused = interaction.options.getFocused(true);
    const autocompleteKey = `${route}:${focused.name}`;

    await this.processInteraction(
      interaction,
      () => autocompleteKey,
      (key) => this.autocompleteMap.get(key)
    );
  }

  // Build the route from commandName, subcommandGroup, subcommand
  private buildSlashRoute(interaction: ChatInputCommandInteraction | AutocompleteInteraction): string {
    const command = interaction.commandName;
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(false);

    let route = command;
    if (group && sub) {
      route = `${route}/${group}/${sub}`;
    } else if (group) {
      route = `${route}/${group}`;
    } else if (sub) {
      route = `${route}/${sub}`;
    }
    return route;
  }
}
