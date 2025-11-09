import { Logger } from '@seedcord/services';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, type ClientEvents } from 'discord.js';

import { EventMetadataKey } from '@bDecorators/Events';
import { MiddlewareMetadataKey, MiddlewareType } from '@bDecorators/Middlewares';
import { EventHandler, EventMiddleware } from '@interfaces/Handler';
import { areRoutes } from '@miscellaneous/areRoutes';

import type { RegisterEventMetadataEntry } from '@bDecorators/Events';
import type { MiddlewareMetadata } from '@bDecorators/Middlewares';
import type { Core } from '@interfaces/Core';
import type { EventHandlerConstructor, EventMiddlewareConstructor } from '@interfaces/Handler';
import type { Initializeable } from '@interfaces/Plugin';
import type { EventFrequency } from '@miscellaneous/types';

interface RegisteredEventMiddleware {
    readonly ctor: EventMiddlewareConstructor;
    readonly priority: number;
    readonly events?: readonly (keyof ClientEvents)[];
}

interface RegisteredEventHandlerEntry {
    readonly ctor: EventHandlerConstructor;
    readonly frequency: EventFrequency;
}

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

    private readonly eventMap = new Collection<keyof ClientEvents, RegisteredEventHandlerEntry[]>();
    private readonly middlewares: RegisteredEventMiddleware[] = [];

    public constructor(protected core: Core) {}

    public async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        const handlersDir = this.core.config.bot.events.path;
        this.logger.info(chalk.bold(handlersDir));

        const middlewareDir = this.core.config.bot.events.middlewares;
        if (middlewareDir) {
            this.logger.info(`${chalk.bold(middlewareDir)} ${chalk.gray('(middlewares)')}`);
            await this.loadMiddlewares(middlewareDir);
        }

        await this.loadHandlers(handlersDir);
        this.attachToClient();

        this.logger.info(`→ ${chalk.magenta.bold(this.middlewares.length)} middlewares`);
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
                    if (!this.isEventHandlerClass(val)) continue;
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
                    if (metadata?.type !== MiddlewareType.Event) continue;

                    this.registerMiddleware(val, metadata, relativePath);
                }
            },
            this.logger
        );
    }

    private registerMiddleware(
        middlewareCtor: EventMiddlewareConstructor,
        metadata: MiddlewareMetadata,
        relativePath: string
    ): void {
        const alreadyRegistered = this.middlewares.some((entry) => entry.ctor === middlewareCtor);
        if (alreadyRegistered) return;

        this.middlewares.push({
            ctor: middlewareCtor,
            priority: metadata.priority,
            ...(metadata.events ? { events: metadata.events } : {})
        });
        this.middlewares.sort((a, b) => a.priority - b.priority);

        this.logger.info(
            `${chalk.italic('Registered event middleware')} ${chalk.bold.yellow(middlewareCtor.name)} ${chalk.gray(`(priority ${metadata.priority})`)} from ${chalk.gray(relativePath)}`
        );
    }

    private async runMiddlewares<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents]
    ): Promise<boolean> {
        for (const { ctor, events } of this.middlewares) {
            if (events && !events.includes(eventName)) continue;

            try {
                const middleware = new ctor(args, this.core);
                if (middleware.hasChecks()) await middleware.runChecks();

                if (middleware.shouldBreak() || middleware.hasErrors()) return false;

                await middleware.execute();

                if (middleware.shouldBreak() || middleware.hasErrors()) return false;
            } catch (err) {
                this.logger.error(`Error in event middleware ${ctor.name} for event ${String(eventName)}:`, err);
                return false;
            }
        }

        return true;
    }

    private isEventHandlerClass(obj: unknown): obj is EventHandlerConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof EventHandler && Reflect.hasMetadata(EventMetadataKey, obj);
    }

    private isMiddlewareClass(obj: unknown): obj is EventMiddlewareConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof EventMiddleware && Reflect.hasMetadata(MiddlewareMetadataKey, obj);
    }

    private registerHandler(handlerClass: EventHandlerConstructor): void {
        const raw = Reflect.getMetadata(EventMetadataKey, handlerClass) as unknown;

        if (Array.isArray(raw)) {
            for (const entry of raw as RegisterEventMetadataEntry<keyof ClientEvents>[]) {
                const key = entry.event;

                let handlers = this.eventMap.get(key);
                if (!handlers) {
                    handlers = [];
                    this.eventMap.set(key, handlers);
                }

                handlers.push({
                    ctor: handlerClass,
                    frequency: entry.frequency
                });
            }
            return;
        }

        const names = areRoutes(raw) ? raw : typeof raw === 'string' ? [raw] : [];

        if (names.length === 0) return;

        for (const name of names) {
            const key = name as keyof ClientEvents;

            let handlers = this.eventMap.get(key);
            if (!handlers) {
                handlers = [];
                this.eventMap.set(key, handlers);
            }
            handlers.push({
                ctor: handlerClass,
                frequency: 'on'
            });
        }
    }

    private attachToClient(): void {
        for (const [eventName, handlerEntries] of this.eventMap) {
            this.logger.debug(
                `Attaching ${chalk.bold.green(eventName)} to the client with ${chalk.gray(handlerEntries.length)} handler(s)`
            );

            for (const entry of handlerEntries) {
                const register =
                    entry.frequency === 'once'
                        ? this.core.bot.client.once.bind(this.core.bot.client)
                        : this.core.bot.client.on.bind(this.core.bot.client);

                register(eventName, (...args: ClientEvents[typeof eventName]) => {
                    void (async () => {
                        await this.processEvent(eventName, args, entry.ctor);
                    })();
                });
            }
        }
    }

    private async processEvent<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents],
        specificHandler?: EventHandlerConstructor
    ): Promise<void> {
        const shouldContinue = await this.runMiddlewares(eventName, args);
        if (!shouldContinue) return;

        if (specificHandler) {
            await this.processHandler(eventName, specificHandler, args);
            return;
        }

        const handlerEntries = this.eventMap.get(eventName);
        if (!handlerEntries || handlerEntries.length === 0) return;

        for (const entry of handlerEntries) {
            await this.processHandler(eventName, entry.ctor, args);
        }
    }

    private async processHandler<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        ctor: EventHandlerConstructor,
        args: ClientEvents[KeyOfEvents]
    ): Promise<void> {
        try {
            this.logger.debug(`Processing ${chalk.bold.green(eventName)} with ${chalk.gray(ctor.name)}`);
            const handler = new ctor(args, this.core);
            if (handler.hasChecks()) await handler.runChecks();

            if (handler.shouldBreak()) return;

            if (!handler.hasErrors()) await handler.execute();
        } catch (err) {
            this.logger.error(`Error in event ${String(eventName)} handler ${ctor.name}:`, err);
        }
    }
}
