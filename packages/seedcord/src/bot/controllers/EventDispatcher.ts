import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/services';
import { hasKeys, traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, type ClientEvents } from 'discord.js';
import { Envapter } from 'envapt';

import { runHandlerGates } from '@bDecorators/Gated';
import { MiddlewareType } from '@bDecorators/Middlewares';
import { eventGateContext } from '@bot/gates/runGates';
import { handleEventFault } from '@bot/handleEventFault';
import { EventHandler, EventMiddleware } from '@handlers/event';
import { HmrModuleHandler } from '@hmr/HmrModuleHandler';
import { areRoutes } from '@miscellaneous/areRoutes';
import { EventMetadataKey, MiddlewareMetadataKey } from '@src/metadataKeys';

import type { RegisterEventMetadataEntry } from '@bDecorators/Events';
import type { MiddlewareMetadata } from '@bDecorators/Middlewares';
import type { ValidNonInteractionKeys } from '@handlers/BaseHandler';
import type { EventHandlerConstructor, EventMiddlewareConstructor } from '@handlers/constructors';
import type { Core } from '@interfaces/Core';
import type { Initializeable } from '@interfaces/Plugin';
import type { EventFrequency } from '@miscellaneous/types';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types/internal';

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
 * Scans event handler directories, registers handlers with Discord client events,
 * and coordinates event execution through the handler system. Does not handle interactions.
 * Multiple handlers can point to one event.
 *
 * @internal
 */
export class EventDispatcher implements Initializeable, HmrAware {
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
            // unreachable today, guards against a path regression
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, ['EventDispatcher', 'events']);
        }

        if (!Envapter.isDevelopment && !Envapter.isTest) return;

        this.hmrHandler = new HmrModuleHandler({
            handlersDir: eventsDir,
            ...(hasKeys(this.core.config.bot.events, ['middlewares'])
                ? { middlewaresDir: this.core.config.bot.events.middlewares }
                : {}),
            isHandler: this.isEventHandlerClass.bind(this),
            isMiddleware: this.isMiddlewareClass.bind(this),
            registerHandler: this.registerHandler.bind(this),
            registerMiddleware: this.registerMiddleware.bind(this),
            unregisterHandler: this.unregisterHandler.bind(this),
            unregisterMiddleware: this.unregisterMiddleware.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger
        });
    }

    private getArtifacts(ctor: EventHandlerConstructor): EventArtifact[] {
        const events: EventArtifact[] = [];
        for (const [event, handlers] of this.eventMap.entries()) {
            if (handlers.some((h) => h.ctor === ctor)) events.push(event);
        }
        return events;
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

    /** @internal For use in dev mode */
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
        // spent follows the ctor identity, so leaving executedOnceHandlers alone keeps a rollback-restored ctor spent
    }

    private unregisterMiddleware(middlewareCtor: EventMiddlewareConstructor): void {
        const index = this.middlewares.findIndex((entry) => entry.ctor === middlewareCtor);
        if (index !== -1) {
            this.middlewares.splice(index, 1);
        }
    }

    private registerMiddleware(middlewareCtor: EventMiddlewareConstructor, relativePath: string): void {
        const metadata = Reflect.getMetadata(MiddlewareMetadataKey, middlewareCtor) as MiddlewareMetadata | undefined;
        if (metadata?.type !== MiddlewareType.Event) return;

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
                const middleware = new ctor(args, this.core, eventName); // event name so a catchall/multi middleware can read this.eventName
                await middleware.execute();
            } catch (caught) {
                // return false so a throw in middleware stops the event for downstream handlers
                handleEventFault(caught, String(eventName), ctor.name, args, this.core);
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

    private registerHandler(handlerClass: EventHandlerConstructor, relativePath: string): void {
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

            // A handler registered post-init (HMR) introduces an event type with no client listener yet.
            if (this.isInitialized && !this.attachedEvents.has(key)) {
                this.attachListener(key);
            }
        };

        if (Array.isArray(raw)) {
            for (const entry of raw as RegisterEventMetadataEntry<keyof ClientEvents>[]) {
                register(entry.event, entry.frequency);
            }
        } else {
            const names = areRoutes(raw) ? raw : typeof raw === 'string' ? [raw] : [];

            for (const name of names) {
                register(name as keyof ClientEvents, 'on');
            }
        }

        this.logger.utils.registration(handlerClass.name, relativePath);
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

        const handlersToExecute = handlerEntries.filter(
            (entry) => entry.frequency !== 'once' || !this.executedOnceHandlers.has(entry.ctor)
        );

        // Return before running middlewares when every handler is a spent 'once'.
        if (handlersToExecute.length === 0) return;

        const shouldContinue = await this.runMiddlewares(eventName, args);
        if (!shouldContinue) return;

        for (const entry of handlersToExecute) {
            // mark a 'once' handler spent before running so a rethrow can't re-fire it. the has() re-check
            // closes the window where a concurrent fire claimed it during the runMiddlewares await
            if (entry.frequency === 'once') {
                if (this.executedOnceHandlers.has(entry.ctor)) continue;
                this.executedOnceHandlers.add(entry.ctor);
            }

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
            const handler = new ctor(args, this.core, eventName); // event name so match can route by it
            const eventCtx = eventGateContext(eventName, args, this.core);
            await runHandlerGates(ctor, eventCtx);
            await handler.execute();
        } catch (caught) {
            handleEventFault(caught, String(eventName), ctor.name, args, this.core);
        }
    }
}
