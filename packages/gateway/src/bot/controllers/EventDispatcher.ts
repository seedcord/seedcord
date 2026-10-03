/* eslint-disable max-lines -- splitting this would split one event's path from load to dispatch across files */
import { DispatchContext } from '@seedcord/core';
import { HmrModuleHandler } from '@seedcord/core/hmr';
import {
    areRoutes,
    asError,
    EventMetadataKey,
    EventMiddlewareMetadataKey,
    eventResultFor,
    MiddlewareRegistry,
    PublishDefault,
    resultFor,
    runAfter,
    runHandlerGates
} from '@seedcord/core/internal';
import { drainInFlight } from '@seedcord/core/node/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath, hasKeys } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import { Envapter } from 'envapt';

import { eventMiddlewareMetaOf } from '#bDecorators/Middlewares';
import { eventGateContext } from '#bot/gates/runGates';
import { handleEventFault } from '#bot/handleEventFault';
import { reportEventDispatched, reportEventDispatching } from '#bot/reportEventDispatch';
import { EventHandler, EventMiddleware } from '#handlers/event';

import type { RegisterEventMetadataEntry } from '#bDecorators/Events';
import type {
    ConstructableEventHandler,
    EventHandlerConstructor,
    EventMiddlewareConstructor
} from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { HandlerResult } from '@seedcord/core';
import type { Initializeable, MiddlewareRegistrationOf } from '@seedcord/core/internal';
import type { EventFrequency, HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { ClientEvents } from 'discord.js';

const eventMiddleware: MiddlewareRegistrationOf<EventMiddlewareConstructor, keyof ClientEvents> = (ctor) => {
    const metadata = eventMiddlewareMetaOf(ctor);
    if (!metadata) return undefined;
    return { priority: metadata.priority, ...(metadata.events && { keys: metadata.events }) };
};

interface RegisteredEventHandlerEntry {
    readonly ctor: EventHandlerConstructor;
    readonly frequency: EventFrequency;
}

type EventArtifact = string;

/**
 * Interactions route through InteractionDispatcher.
 *
 * @internal
 */
export class EventDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Events', { channel: 'events' });
    private isInitialized = false;

    private readonly eventMap = new Map<keyof ClientEvents, RegisteredEventHandlerEntry[]>();
    private readonly middlewares = new MiddlewareRegistry<EventMiddlewareConstructor, keyof ClientEvents>(
        eventMiddleware
    );
    private readonly executedOnceHandlers = new Set<EventHandlerConstructor>();
    private readonly attachedEvents = new Set<keyof ClientEvents>();

    private readonly inFlight = new Set<Promise<void>>();
    private draining = false;

    // a reload reports on the hmr channel
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

        utils.summary(
            'Loaded',
            { 'event handlers': this.loadedHandlers.length, middlewares: this.loadedMiddlewares.length },
            'debug'
        );

        if (this.loadedMiddlewares.length > 0) {
            utils.block('Loaded event middlewares', utils.entries(this.loadedMiddlewares), 'debug');
        }

        const perEvent: Record<string, number> = {};
        for (const [event, handlers] of this.eventMap) perEvent[event] = handlers.length;

        utils.block(
            'Loaded event handlers',
            [...utils.entries(this.loadedHandlers), ...utils.counts(perEvent)],
            'debug'
        );
    }

    private async loadHandlers(dir: string): Promise<void> {
        await traverseDirectory(dir, (fullPath, relativePath, imported) => {
            for (const val of Object.values(imported)) {
                if (!this.isEventHandlerClass(val)) continue;
                this.registerHandler(val, relativePath);
                this.hmrHandler?.trackHandler(fullPath, val);
            }
        });
    }

    private async loadMiddlewares(dir: string): Promise<void> {
        await traverseDirectory(dir, (fullPath, relativePath, imported) => {
            for (const val of Object.values(imported)) {
                if (!this.isMiddlewareClass(val)) continue;

                this.registerMiddleware(val, relativePath);
                this.hmrHandler?.trackMiddleware(fullPath, val);
            }
        });
    }

    /** @internal */
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
        // leaving executedOnceHandlers alone keeps a rollback-restored ctor spent
    }

    private unregisterMiddleware(middlewareCtor: EventMiddlewareConstructor): void {
        this.middlewares.unregister(middlewareCtor);
    }

    private registerMiddleware(middlewareCtor: EventMiddlewareConstructor, relativePath: string): void {
        const registration = this.middlewares.register(middlewareCtor);
        if (!registration || !this.loading) return;

        // the events are the only place a dev sees that a middleware is scoped
        const scope = registration.keys
            ? `${registration.priority}, ${registration.keys.join(', ')}`
            : registration.priority;
        this.loadedMiddlewares.push({
            name: `${middlewareCtor.name} (${String(scope)})`,
            from: formatFilePath(relativePath)
        });
    }

    // a returned value is the throw that stopped the event before any handler ran
    private async runMiddlewares<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents],
        dispatch: DispatchContext,
        ran: EventMiddleware[]
    ): Promise<{ caught: unknown } | null> {
        for (const Middleware of this.middlewares.chainFor(eventName)) {
            try {
                const middleware = new Middleware(args, this.core, dispatch, eventName);
                // pushed before the await because a middleware that throws still gets its after()
                ran.push(middleware);
                await middleware.execute();
            } catch (caught) {
                handleEventFault(
                    caught,
                    { eventName: String(eventName), handlerName: Middleware.name, args, dispatch },
                    this.core
                );
                return { caught };
            }
        }

        return null;
    }

    private isEventHandlerClass(obj: unknown): obj is EventHandlerConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof EventHandler && Reflect.hasMetadata(EventMetadataKey, obj);
    }

    private isMiddlewareClass(obj: unknown): obj is EventMiddlewareConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof EventMiddleware && Reflect.hasMetadata(EventMiddlewareMetadataKey, obj);
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

            // a post-init (hmr) registration can add an event with no client listener yet
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
            `Attaching ${paint.sky.bold(eventName)} to the client with ${paint.mute(handlerEntries?.length ?? 0)} handler(s)`
        );

        this.core.bot.client.on(eventName, (...args: ClientEvents[typeof eventName]) => {
            if (this.draining) return;
            const run = this.processEvent(eventName, args).catch((caught: unknown) => {
                const error = asError(caught);
                this.logger.error(`[${paint.coral.bold('UNHANDLED ERROR AT ROOT')}] ${error.name}`, error.stack);
                this.core.bus[PublishDefault]('unhandledEventError', { error });
            });
            this.inFlight.add(run);
            void run.finally(() => this.inFlight.delete(run));
        });
    }

    public stopAccepting(): void {
        this.draining = true;
    }

    public drain(timeoutMs: number): Promise<void> {
        return drainInFlight(this.inFlight, timeoutMs, this.logger, 'Events');
    }

    private async processEvent<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents]
    ): Promise<void> {
        const startedAt = performance.now();
        const handlerEntries = this.eventMap.get(eventName);
        if (!handlerEntries || handlerEntries.length === 0) return;

        const handlersToExecute = handlerEntries.filter(
            (entry) => entry.frequency !== 'once' || !this.executedOnceHandlers.has(entry.ctor)
        );

        if (handlersToExecute.length === 0) return;

        const dispatch = new DispatchContext(`event:${String(eventName)}`);
        reportEventDispatching(this.core, dispatch.id, eventName, args);

        const ran: EventMiddleware[] = [];
        const handlers: HandlerResult[] = [];
        let stopped: { caught: unknown } | null = null;

        try {
            stopped = await this.runMiddlewares(eventName, args, dispatch, ran);
            if (stopped) return;

            for (const entry of handlersToExecute) {
                // marked spent before running so a rethrow can't re-fire it
                if (entry.frequency === 'once') {
                    // a concurrent fire could have claimed it during the runMiddlewares await
                    if (this.executedOnceHandlers.has(entry.ctor)) continue;
                    this.executedOnceHandlers.add(entry.ctor);
                }

                handlers.push(await this.processHandler(eventName, entry.ctor, args, dispatch));
            }
        } finally {
            const result = eventResultFor(stopped, handlers);
            reportEventDispatched(this.core, dispatch.id, eventName, result, startedAt);
            await runAfter(ran, result, this.logger);
        }
    }

    private async processHandler<KeyOfEvents extends keyof ClientEvents>(
        eventName: KeyOfEvents,
        Ctor: EventHandlerConstructor,
        args: ClientEvents[KeyOfEvents],
        dispatch: DispatchContext
    ): Promise<HandlerResult> {
        try {
            this.logger.debug(`Processing ${paint.sky.bold(eventName)} with ${paint.mute(Ctor.name)}`);
            // the event map paired this name with this class
            const handler = new (Ctor as ConstructableEventHandler)(args, this.core, dispatch, eventName);
            const eventCtx = eventGateContext(eventName, args, this.core, dispatch);
            await runHandlerGates(Ctor, eventCtx);
            await handler.execute();
            return { handler: Ctor.name, outcome: 'handled' };
        } catch (caught) {
            handleEventFault(
                caught,
                { eventName: String(eventName), handlerName: Ctor.name, args, dispatch },
                this.core
            );
            return { handler: Ctor.name, ...resultFor(caught) };
        }
    }
}
