import { Logger } from '@seedcord/services';
import { formatFilePath, hasKeys, traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, type ClientEvents } from 'discord.js';
import { Envapter } from 'envapt';

import { EventMetadataKey } from '@bDecorators/Events';
import { MiddlewareMetadataKey, MiddlewareType } from '@bDecorators/Middlewares';
import { HmrModuleHandler } from '@hmr/HmrModuleHandler';
import { EventHandler, EventMiddleware } from '@interfaces/Handler';
import { areRoutes } from '@miscellaneous/areRoutes';

import type { RegisterEventMetadataEntry } from '@bDecorators/Events';
import type { MiddlewareMetadata } from '@bDecorators/Middlewares';
import type { Core } from '@interfaces/Core';
import type { EventHandlerConstructor, EventMiddlewareConstructor, ValidNonInteractionKeys } from '@interfaces/Handler';
import type { Initializeable } from '@interfaces/Plugin';
import type { EventFrequency } from '@miscellaneous/types';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/cli';

interface RegisteredEventMiddleware {
    readonly ctor: EventMiddlewareConstructor;
    readonly priority: number;
    readonly events?: readonly ValidNonInteractionKeys[];
}

interface RegisteredEventHandlerEntry {
    readonly ctor: EventHandlerConstructor;
    readonly frequency: EventFrequency;
}

type EventArtifact = string;

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
export class EventController implements Initializeable, HmrAware {
    private readonly logger = new Logger('Events');
    private isInitialized = false;

    public readonly name = 'Events';

    private readonly eventMap = new Collection<keyof ClientEvents, RegisteredEventHandlerEntry[]>();
    private readonly middlewares: RegisteredEventMiddleware[] = [];
    private readonly executedOnceHandlers = new Set<EventHandlerConstructor>();
    private readonly attachedEvents = new Set<keyof ClientEvents>();

    private readonly hmrHandler?: HmrModuleHandler<
        EventHandlerConstructor,
        EventMiddlewareConstructor,
        EventArtifact[]
    >;

    public constructor(protected core: Core) {
        const eventsDir = this.core.config.bot.events.path;
        if (!eventsDir) {
            // This should never happen as EventController is only instantiated if path is set. But if it does, it should stop the whole process.
            throw new Error('EventController instantiated without events path');
        }

        if (!Envapter.isDevelopment) return; // HMR only in development
        this.hmrHandler = new HmrModuleHandler({
            handlersDir: eventsDir,
            ...(hasKeys(this.core.config.bot.events, ['middlewares'])
                ? { middlewaresDir: this.core.config.bot.events.middlewares }
                : {}),
            isHandler: this.isEventHandlerClass.bind(this),
            isMiddleware: this.isMiddlewareClass.bind(this),
            registerHandler: (handler) => this.registerHandler(handler),
            registerMiddleware: (middleware, file) => {
                const metadata = Reflect.getMetadata(MiddlewareMetadataKey, middleware) as
                    | MiddlewareMetadata
                    | undefined;
                if (metadata?.type === MiddlewareType.Event) {
                    this.registerMiddleware(middleware, metadata, formatFilePath(file));
                }
            },
            unregisterHandler: (handler, artifacts) => this.unregisterHandler(handler, artifacts),
            unregisterMiddleware: this.unregisterMiddleware.bind(this),
            getArtifacts: (handler) => {
                const events: EventArtifact[] = [];
                for (const [event, handlers] of this.eventMap.entries()) {
                    if (handlers.some((h) => h.ctor === handler)) events.push(event);
                }
                return events;
            },
            logger: this.logger.inChannel('hmr'),
            name: 'Event'
        });
    }

    public async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        const handlersDir = this.core.config.bot.events.path;
        if (!handlersDir) {
            return;
        }
        this.logger.info(chalk.bold(handlersDir));

        const middlewareDir = hasKeys(this.core.config.bot.events, ['middlewares'])
            ? this.core.config.bot.events.middlewares
            : undefined;
        if (middlewareDir) {
            this.logger.info(`${chalk.bold(middlewareDir)} ${chalk.gray('(middlewares)')}`);
            await this.loadMiddlewares(middlewareDir);
        }

        await this.loadHandlers(handlersDir);
        this.attachToClient();

        this.logger.info(`${chalk.bold.green('Loaded event handlers:')}`);
        const eventList: string[] = [`${chalk.magenta.bold(this.middlewares.length)} middlewares`];
        this.eventMap.forEach((handlers, eventName) => {
            eventList.push(`${chalk.magenta.bold(handlers.length)} ${eventName}`);
        });
        this.logger.utils.list(eventList);
    }

    private async loadHandlers(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (fullPath, relativePath, imported) => {
                for (const val of Object.values(imported)) {
                    if (!this.isEventHandlerClass(val)) continue;
                    this.registerHandler(val);
                    this.hmrHandler?.trackHandler(fullPath, val);
                    this.logger.utils.registration(val.name, relativePath);
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
                    const metadata = Reflect.getMetadata(MiddlewareMetadataKey, val) as MiddlewareMetadata | undefined;
                    if (metadata?.type !== MiddlewareType.Event) continue;

                    this.registerMiddleware(val, metadata, relativePath);
                    this.hmrHandler?.trackMiddleware(fullPath, val);
                }
            },
            this.logger
        );
    }

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    private unregisterHandler(handlerClass: EventHandlerConstructor, artifacts?: EventArtifact[]): void {
        const events = artifacts ?? Array.from(this.eventMap.keys());
        for (const event of events) {
            const handlers = this.eventMap.get(event as keyof ClientEvents);
            if (!handlers) continue;
            const index = handlers.findIndex((h) => h.ctor === handlerClass);
            if (index !== -1) {
                handlers.splice(index, 1);
                if (handlers.length === 0) {
                    this.eventMap.delete(event as keyof ClientEvents);
                }
            }
        }
        this.executedOnceHandlers.delete(handlerClass);
    }

    private unregisterMiddleware(middlewareCtor: EventMiddlewareConstructor): void {
        const index = this.middlewares.findIndex((entry) => entry.ctor === middlewareCtor);
        if (index !== -1) {
            this.middlewares.splice(index, 1);
        }
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

        this.logger.utils.registration(
            `${middlewareCtor.name} ${chalk.gray(`(${metadata.priority})`)}`,
            relativePath,
            'event middleware'
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

        const register = (key: keyof ClientEvents, frequency: EventFrequency): void => {
            let handlers = this.eventMap.get(key);
            if (!handlers) {
                handlers = [];
                this.eventMap.set(key, handlers);
            }

            handlers.push({
                ctor: handlerClass,
                frequency
            });

            // If HMR adds a new event type, ensure listener is attached
            if (this.isInitialized && !this.attachedEvents.has(key)) {
                this.attachListener(key);
            }
        };

        if (Array.isArray(raw)) {
            for (const entry of raw as RegisterEventMetadataEntry<keyof ClientEvents>[]) {
                register(entry.event, entry.frequency);
            }
            return;
        }

        const names = areRoutes(raw) ? raw : typeof raw === 'string' ? [raw] : [];

        if (names.length === 0) return;

        for (const name of names) {
            register(name as keyof ClientEvents, 'on');
        }
    }

    private attachToClient(): void {
        for (const [eventName] of this.eventMap) {
            this.attachListener(eventName);
        }
    }

    private attachListener(eventName: keyof ClientEvents): void {
        if (this.attachedEvents.has(eventName)) return;
        this.attachedEvents.add(eventName);

        const handlerEntries = this.eventMap.get(eventName);
        this.logger.debug(
            `Attaching ${chalk.bold.green(eventName)} to the client with ${chalk.gray(handlerEntries?.length ?? 0)} handler(s)`
        );

        // Attach a single listener per event type that looks up handlers from the map
        this.core.bot.client.on(eventName, (...args: ClientEvents[typeof eventName]) => {
            this.core.bot.emit('any:event', eventName, ...args);
            void (async () => {
                await this.processEvent(eventName, args).catch((err: Error) => {
                    this.logger.error(`[${chalk.bold.red('UNHANDLED ERROR AT ROOT')}] ${err.name}`, err.stack);
                    this.core.bot.emit('error:unhandled:event', err);
                });
            })();
        });
    }

    private async processEvent<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents]
    ): Promise<void> {
        const handlerEntries = this.eventMap.get(eventName);
        if (!handlerEntries || handlerEntries.length === 0) return;

        // Check if there are any handlers that need to execute
        const handlersToExecute = handlerEntries.filter(
            (entry) => entry.frequency !== 'once' || !this.executedOnceHandlers.has(entry.ctor)
        );

        // If no handlers need to execute, skip middlewares and return early
        if (handlersToExecute.length === 0) return;

        const shouldContinue = await this.runMiddlewares(eventName, args);
        if (!shouldContinue) return;

        for (const entry of handlersToExecute) {
            await this.processHandler(eventName, entry.ctor, args);

            // Mark 'once' handlers as executed
            if (entry.frequency === 'once') this.executedOnceHandlers.add(entry.ctor);
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
