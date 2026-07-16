import { HmrModuleHandler } from '@seedcord/core/hmr';
import { EventMetadataKey, MiddlewareMetadataKey, runHandlerGates, areRoutes } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger, paint } from '@seedcord/logger';
import { formatFilePath, hasKeys } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import { Envapter } from 'envapt';

import { MiddlewareType } from '@bDecorators/Middlewares';
import { eventGateContext } from '@bot/gates/runGates';
import { handleEventFault } from '@bot/handleEventFault';
import { EventHandler, EventMiddleware } from '@handlers/event';

import type { RegisterEventMetadataEntry } from '@bDecorators/Events';
import type { MiddlewareMetadata } from '@bDecorators/Middlewares';
import type { EventHandlerConstructor, EventMiddlewareConstructor } from '@handlers/constructors';
import type { Core } from '@interfaces/Core';
import type { Initializeable } from '@interfaces/Plugin';
import type { EventFrequency } from '@miscellaneous/types';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { ValidNonInteractionKeys } from '@src/handlers/interactionTypes';
import type { ClientEvents } from 'discord.js';

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

    private readonly eventMap = new Map<keyof ClientEvents, RegisteredEventHandlerEntry[]>();
    private readonly middlewares: RegisteredEventMiddleware[] = [];
    private readonly executedOnceHandlers = new Set<EventHandlerConstructor>();
    private readonly attachedEvents = new Set<keyof ClientEvents>();

    // batched during bulk load, hmr registrations log inline
    private loading = false;
    private readonly loadedHandlers: { name: string; from: string }[] = [];
    private readonly loadedMiddlewares: { name: string; from: string }[] = [];

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
            ...(hasKeys(this.core.config.bot.events, ['middlewares']) && {
                middlewaresDir: this.core.config.bot.events.middlewares
            }),
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

        const middlewareDir = hasKeys(this.core.config.bot.events, ['middlewares'])
            ? this.core.config.bot.events.middlewares
            : undefined;

        this.loading = true;
        this.loadedHandlers.length = 0;
        this.loadedMiddlewares.length = 0;
        try {
            if (middlewareDir) await this.loadMiddlewares(middlewareDir);
            await this.loadHandlers(handlersDir);
        } finally {
            this.loading = false;
        }

        this.attachToClient();
        this.reportLoad();
    }

    private reportLoad(): void {
        const { utils } = this.logger;

        utils.summary('Loaded', {
            'event handlers': this.loadedHandlers.length,
            middlewares: this.loadedMiddlewares.length
        });

        if (this.loadedMiddlewares.length > 0) {
            utils.block('Loaded event middlewares', utils.entries(this.loadedMiddlewares));
        }

        const perEvent: Record<string, number> = {};
        for (const [event, handlers] of this.eventMap) perEvent[event] = handlers.length;

        utils.block('Loaded event handlers', [...utils.entries(this.loadedHandlers), ...utils.counts(perEvent)]);
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
        const events = artifacts ?? [...this.eventMap.keys()];
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
            ...(metadata.events && { events: metadata.events })
        });
        this.middlewares.sort((a, b) => a.priority - b.priority);

        if (this.loading) {
            this.loadedMiddlewares.push({
                name: `${middlewareCtor.name} (${metadata.priority})`,
                from: formatFilePath(relativePath)
            });
            return;
        }

        this.logger.utils.registration(
            `${middlewareCtor.name} ${paint.mute(`(${metadata.priority})`)}`,
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
                // a middleware throw stops the event for downstream handlers
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

        const from = formatFilePath(relativePath);
        if (this.loading) this.loadedHandlers.push({ name: handlerClass.name, from });
        else this.logger.utils.registration(handlerClass.name, from);
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
            `Attaching ${paint.mint.bold(eventName)} to the client with ${paint.mute(handlerEntries?.length ?? 0)} handler(s)`
        );

        this.core.bot.client.on(eventName, (...args: ClientEvents[typeof eventName]) => {
            this.core.bot.emitSafe('any:event', eventName, ...args);
            void (async () => {
                await this.processEvent(eventName, args).catch((err: Error) => {
                    this.logger.error(`[${paint.coral.bold('UNHANDLED ERROR AT ROOT')}] ${err.name}`, err.stack);
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

        // avoid running middlewares when every handler is a spent 'once'
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
            this.logger.debug(`Processing ${paint.mint.bold(eventName)} with ${paint.mute(ctor.name)}`);
            const handler = new ctor(args, this.core, eventName); // event name so match can route by it
            const eventCtx = eventGateContext(eventName, args, this.core);
            await runHandlerGates(ctor, eventCtx);
            await handler.execute();
        } catch (caught) {
            handleEventFault(caught, String(eventName), ctor.name, args, this.core);
        }
    }
}
