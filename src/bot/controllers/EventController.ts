import * as path from 'path';

import chalk from 'chalk';

import { traverseDirectory } from '../../core/library/Helpers';
import { Logger } from '../../core/services/Logger';
import { EventMetadataKey } from '../decorators/EventRegisterable';
import { EventHandler } from '../interfaces/Handler';

import type { CoreBot } from '../../core/CoreBot';
import type { EventHandlerConstructor } from '../interfaces/Handler';
import type { ClientEvents } from 'discord.js';

export class EventController {
  private readonly logger = new Logger('Events');
  private isInitialized = false;

  private readonly eventMap = new Map<keyof ClientEvents, EventHandlerConstructor[]>();

  public constructor(protected core: CoreBot) {}

  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    const handlersDir = path.resolve(__dirname, '../events');
    this.logger.info(chalk.bold(handlersDir));

    await this.loadHandlers(handlersDir);
    this.attachToClient();

    const loadedEventsArray: string[] = [];
    this.eventMap.forEach((handlers, eventName) => {
      loadedEventsArray.push(`${chalk.magenta.bold(handlers.length)} ${eventName}`);
    });
    this.logger.info(
      `${chalk.bold.green('Loaded')}: ${this.eventMap.size > 0 ? loadedEventsArray.join(', ') : 'none'}`
    );
  }

  private async loadHandlers(dir: string): Promise<void> {
    await traverseDirectory(dir, (_fullPath, relativePath, imported) => {
      for (const exportName of Object.keys(imported)) {
        const val = imported[exportName];
        if (this.isEventHandlerClass(val)) {
          this.registerHandler(val);
          this.logger.info(
            `${chalk.italic('Registered')} ${chalk.bold.yellow(val.name)} from ${chalk.gray(relativePath)}`
          );
        }
      }
    });
  }

  private isEventHandlerClass(obj: unknown): obj is EventHandlerConstructor {
    if (typeof obj !== 'function') return false;
    return obj.prototype instanceof EventHandler && Reflect.hasMetadata(EventMetadataKey, obj);
  }

  private registerHandler(handlerClass: EventHandlerConstructor): void {
    const eventName = Reflect.getMetadata(EventMetadataKey, handlerClass) as keyof ClientEvents | undefined;
    if (!eventName) return;

    let handlers = this.eventMap.get(eventName);
    if (!handlers) {
      handlers = [];
      this.eventMap.set(eventName, handlers);
    }
    handlers.push(handlerClass);
  }

  private attachToClient(): void {
    for (const [eventName] of this.eventMap) {
      // For each event type, call all relevant handlers in sequence.
      this.logger.debug(
        `Attaching ${chalk.bold.green(eventName)} to ${chalk.bold.yellow(this.core.bot.client.user?.username)}`
      );
      this.core.bot.client.on(eventName, (...args: ClientEvents[typeof eventName]) => {
        void (async () => {
          await this.processEvent(eventName, args);
        })();
      });
    }
  }

  private async processEvent<T extends keyof ClientEvents>(eventName: T, args: ClientEvents[T]): Promise<void> {
    const handlerCtors = this.eventMap.get(eventName);
    if (!handlerCtors || handlerCtors.length === 0) return;

    for (const HandlerCtor of handlerCtors) {
      try {
        this.logger.debug(`Processing ${chalk.bold.green(eventName)} with ${chalk.gray(HandlerCtor.name)}`);
        const handler = new HandlerCtor(args, this.core);
        if (handler.hasChecks()) {
          await handler.runChecks();
        }

        if (handler.shouldBreak()) return;

        // Execute if no errors
        if (!handler.hasErrors()) {
          await handler.execute();
        }
      } catch (err) {
        this.logger.error(`Error in event ${String(eventName)} handler ${HandlerCtor.name}:`, err);
      }
    }
  }
}
