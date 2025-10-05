import { Logger } from '@seedcord/services';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, type ClientEvents } from 'discord.js';

import { EventHandler } from '../../interfaces/Handler';
import { EventMetadataKey } from '../decorators/EventRegisterable';

import type { Core } from '../../interfaces/Core';
import type { EventHandlerConstructor } from '../../interfaces/Handler';
import type { Initializeable } from '../../interfaces/Plugin';

/**
 * Manages Discord event handler registration and execution.
 *
 * Scans event handler directories, registers handlers with Discord client events,
 * and coordinates event execution through the handler system. Does not handle interactions.
 *
 * Multiple handlers can point to one event.
 *
 * @internal
 */
export class EventController implements Initializeable {
    private readonly logger = new Logger('Events');
    private isInitialized = false;

    private readonly eventMap = new Collection<keyof ClientEvents, EventHandlerConstructor[]>();

    public constructor(protected core: Core) {}

    public async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        const handlersDir = this.core.config.bot.events.path;
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
        await traverseDirectory(
            dir,
            (_fullPath, relativePath, imported) => {
                for (const val of Object.values(imported)) {
                    if (this.isEventHandlerClass(val)) {
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
            // For each event type, call all relevant effects in sequence.
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

    private async processEvent<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents]
    ): Promise<void> {
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
