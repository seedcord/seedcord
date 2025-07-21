import * as path from 'path';

import chalk from 'chalk';
import { Events } from 'discord.js';

import { traverseDirectory } from '../../core/library/Helpers';
import { LogService } from '../../core/services/LogService';
import { InteractionMetadataKey, InteractionRoutes } from '../decorators/InteractionConfigurable';
import { UnhandledEvent } from '../handlers/UnhandledEvent';
import { InteractionHandler } from '../interfaces/Handler';

import type { CoreBot } from '../../core/CoreBot';
import type { HandlerConstructor, MiddlewareConstructor, Repliables } from '../interfaces/Handler';
import type { ChatInputCommandInteraction, Interaction } from 'discord.js';

export class InteractionController {
  private readonly logger = new LogService('Interactions');
  private isInitialized = false;

  private readonly slashMap = new Map<string, HandlerConstructor>();
  private readonly buttonMap = new Map<string, HandlerConstructor>();
  private readonly modalMap = new Map<string, HandlerConstructor>();
  private readonly stringSelectMenuMap = new Map<string, HandlerConstructor>();

  private readonly keysToIgnore = new Set(['confirm!confirmable', 'cancel!confirmable']);

  private readonly middlewares: MiddlewareConstructor[] = [];

  constructor(protected core: CoreBot) {}

  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    const handlersDir = path.resolve(__dirname, '../handlers');
    this.logger.info(chalk.bold(handlersDir));

    await this.loadHandlers(handlersDir);
    this.attachToClient();

    this.logger.info(
      `${chalk.bold.green('Loaded')}: ${chalk.magenta.bold(this.slashMap.size)} slash, ` +
        `${chalk.magenta.bold(this.buttonMap.size)} buttons, ` +
        `${chalk.magenta.bold(this.modalMap.size)} modals, ` +
        `${chalk.magenta.bold(this.stringSelectMenuMap.size)} string selects`
    );
  }

  private async loadHandlers(dir: string): Promise<void> {
    await traverseDirectory(dir, (_fullPath, relativePath, imported) => {
      for (const exportName of Object.keys(imported)) {
        const val = imported[exportName];
        if (this.isHandlerClass(val)) {
          this.registerHandler(val);
          this.logger.info(
            `${chalk.italic('Registered')} ${chalk.bold.yellow(val.name)} from ${chalk.gray(relativePath)}`
          );
        }
      }
    });
  }

  private isHandlerClass(obj: unknown): obj is HandlerConstructor {
    if (typeof obj !== 'function') return false;
    return obj.prototype instanceof InteractionHandler && Reflect.hasMetadata(InteractionMetadataKey, obj);
  }

  private registerHandler(handlerClass: HandlerConstructor): void {
    const areRoutes = (routes: unknown): routes is string[] => {
      return Array.isArray(routes) && routes.every((r) => typeof r === 'string');
    };

    const routeTypes: [InteractionRoutes, Map<string, HandlerConstructor>][] = [
      [InteractionRoutes.Slash, this.slashMap],
      [InteractionRoutes.Button, this.buttonMap],
      [InteractionRoutes.Modal, this.modalMap],
      [InteractionRoutes.StringMenu, this.stringSelectMenuMap]
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

  public async processInteraction<T extends Interaction>(
    interaction: T,
    extractKey: (i: T) => string,
    getHandler: (key: string) => HandlerConstructor | undefined
  ): Promise<void> {
    const key = extractKey(interaction);
    if (this.keysToIgnore.has(key)) {
      return;
    }
    // Run middlewares first
    for (const MiddlewareCtor of this.middlewares) {
      const middleware = new MiddlewareCtor(interaction as Repliables, this.core);
      await middleware.execute();
      if (middleware.hasErrors()) {
        return;
      }
    }
    let HandlerCtor = getHandler(key);
    if (!HandlerCtor) {
      // Automatically fallback to UnhandledEvent
      this.logger.warn(`No handler found for key ${chalk.bold.cyan(key)}. Falling back to UnhandledEvent.`);
      HandlerCtor = UnhandledEvent;
    }

    this.logger.debug(`Processing ${chalk.bold.green(key)} with ${chalk.gray(HandlerCtor.name)}`);
    const handler = new HandlerCtor(interaction as Repliables, this.core);
    if (handler.hasChecks()) {
      await handler.runChecks();
    }

    if (handler.shouldBreak()) return;

    if (!handler.hasErrors()) {
      await handler.execute();
    }
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    switch (true) {
      case interaction.isChatInputCommand():
        {
          const route = this.buildSlashRoute(interaction);
          await this.processInteraction(
            interaction,
            () => route,
            (key) => this.slashMap.get(key)
          );
        }
        break;
      case interaction.isButton():
        {
          const buttonPrefix = interaction.customId.split('-')[0];
          await this.processInteraction(
            interaction,
            () => buttonPrefix,
            (key) => this.buttonMap.get(key)
          );
        }
        break;
      case interaction.isModalSubmit():
        {
          const modalPrefix = interaction.customId.split('-')[0];
          await this.processInteraction(
            interaction,
            () => modalPrefix,
            (key) => this.modalMap.get(key)
          );
        }
        break;
      case interaction.isStringSelectMenu(): {
        const selectMenuPrefix = interaction.customId.split('-')[0];
        await this.processInteraction(
          interaction,
          () => selectMenuPrefix,
          (key) => this.stringSelectMenuMap.get(key)
        );
        break;
      }
      default:
        this.logger.warn(`Unhandled interaction type: ${interaction.type}`);
        break;
    }
  }

  // Build the route from commandName, subcommandGroup, subcommand
  private buildSlashRoute(interaction: ChatInputCommandInteraction): string {
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
