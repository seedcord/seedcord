import {
    DispatchContext,
    EventMetadataKey,
    EventMiddlewareMetadataKey,
    eventResultFor,
    HandlerLoader,
    MiddlewareRegistry,
    OnceTracker,
    PublishDefault,
    resultFor,
    runAfter,
    runHandlerGates
} from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { HostPlugins } from '@seedcord/types/internal';
import { hasKeys } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';

import { eventMiddlewareMetaOf } from '#bDecorators/Middlewares';
import { eventGateContext, eventOrigin } from '#bot/gates/context';
import { handleEventFault } from '#bot/handleEventFault';
import { reportEventDispatched, reportEventDispatching } from '#bot/reportEventDispatch';
import { EventHandler, EventMiddleware } from '#handlers/event';
import { deriveEventActor } from '#miscellaneous/deriveEventActor';

import type { RegisterEventMetadataEntry } from '#bDecorators/Events';
import type {
    ConstructableEventHandler,
    EventHandlerConstructor,
    EventMiddlewareConstructor
} from '#handlers/constructors';
import type { ValidNonInteractionKeys } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { HandlerResult } from '@seedcord/core';
import type { Initializeable, MiddlewareRegistrationOf } from '@seedcord/core/internal';
import type { InFlight } from '@seedcord/core/node/internal';
import type { EventFrequency, HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { ClientEvents } from 'discord.js';

const eventMiddleware: MiddlewareRegistrationOf<EventMiddlewareConstructor, ValidNonInteractionKeys> = (ctor) => {
    const metadata = eventMiddlewareMetaOf(ctor);
    if (!metadata) return undefined;
    return { priority: metadata.priority, ...(metadata.events && { keys: metadata.events }) };
};

interface RegisteredEventHandlerEntry {
    readonly ctor: EventHandlerConstructor;
    readonly frequency: EventFrequency;
}

/**
 * Interactions route through InteractionDispatcher.
 *
 * @internal
 */
export class EventDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Events', { channel: 'events' });
    private isInitialized = false;

    private readonly eventMap = new Map<ValidNonInteractionKeys, RegisteredEventHandlerEntry[]>();
    private readonly middlewares = new MiddlewareRegistry<EventMiddlewareConstructor, ValidNonInteractionKeys>(
        eventMiddleware
    );
    private readonly onceRuns = new OnceTracker();
    private readonly attachedEvents = new Set<ValidNonInteractionKeys>();

    private readonly loader: HandlerLoader<
        EventHandlerConstructor,
        EventMiddlewareConstructor,
        ValidNonInteractionKeys
    >;

    public constructor(
        protected core: Core,
        private readonly inFlight: InFlight
    ) {
        const eventsDir = this.core.config.bot.events.path;
        if (!eventsDir) {
            // unreachable today, guards against a path regression
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, ['EventDispatcher', 'events']);
        }

        this.loader = new HandlerLoader({
            handlersDir: eventsDir,
            middlewaresDir: hasKeys(this.core.config.bot.events, ['middlewares'])
                ? this.core.config.bot.events.middlewares
                : undefined,
            middlewares: this.middlewares,
            plugins: this.core[HostPlugins],
            logger: this.logger,
            isHandler: (value): value is EventHandlerConstructor => this.isEventHandlerClass(value),
            isMiddleware: (value): value is EventMiddlewareConstructor => this.isMiddlewareClass(value),
            storeHandler: (ctor) => this.storeHandler(ctor),
            removeHandler: (ctor) => this.unregisterHandler(ctor)
        });
    }

    public async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        await this.loader.load();
        this.attachToClient();
        this.reportLoad();
    }

    private reportLoad(): void {
        const { utils } = this.logger;
        const { loadedHandlers, loadedMiddlewares } = this.loader;

        utils.summary(
            'Loaded',
            { 'event handlers': loadedHandlers.length, middlewares: loadedMiddlewares.length },
            'debug'
        );

        if (loadedMiddlewares.length > 0) {
            utils.block('Loaded event middlewares', utils.entries(loadedMiddlewares), 'debug');
        }

        const perEvent: Record<string, number> = {};
        for (const [event, handlers] of this.eventMap) perEvent[event] = handlers.length;

        utils.block('Loaded event handlers', [...utils.entries(loadedHandlers), ...utils.counts(perEvent)], 'debug');
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.loader.onHmr(event);
    }

    private unregisterHandler(handlerClass: EventHandlerConstructor): void {
        for (const [event, handlers] of this.eventMap) {
            const index = handlers.findIndex((h) => h.ctor === handlerClass);
            if (index === -1) continue;

            handlers.splice(index, 1);
            if (handlers.length === 0) {
                this.eventMap.delete(event);
            }
        }
    }

    private async buildMembers(args: unknown, dispatch: DispatchContext): Promise<{ caught: unknown } | null> {
        try {
            await this.core[HostPlugins].buildMembers(dispatch, eventOrigin(deriveEventActor(args)));
            return null;
        } catch (caught) {
            handleEventFault(caught, { handlerName: 'dispatchMembers', args, dispatch }, this.core);
            return { caught };
        }
    }

    // a returned value is the throw that stopped the event before any handler ran
    private async runMiddlewares<KeyOfEvents extends ValidNonInteractionKeys>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents],
        dispatch: DispatchContext,
        ran: EventMiddleware[]
    ): Promise<{ caught: unknown } | null> {
        for (const Middleware of this.middlewares.chainFor(eventName)) {
            try {
                const middleware = this.core[HostPlugins].assertMembersKept(
                    new Middleware(args, this.core, dispatch),
                    dispatch
                );
                // pushed before the await because a middleware that throws still gets its after()
                ran.push(middleware);
                await middleware.execute();
            } catch (caught) {
                handleEventFault(caught, { handlerName: Middleware.name, args, dispatch }, this.core);
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

    private storeHandler(handlerClass: EventHandlerConstructor): true {
        // justified: @RegisterEvent is the only writer of this key
        const entries = Reflect.getMetadata(
            EventMetadataKey,
            handlerClass
        ) as RegisterEventMetadataEntry<ValidNonInteractionKeys>[];

        const register = (key: ValidNonInteractionKeys, frequency: EventFrequency): void => {
            let handlers = this.eventMap.get(key);
            if (!handlers) {
                handlers = [];
                this.eventMap.set(key, handlers);
            }

            handlers.push({
                ctor: handlerClass,
                frequency
            });

            // a post-init (hmr) registration can add an event without a client listener yet
            if (this.isInitialized && !this.attachedEvents.has(key)) {
                this.attachListener(key);
            }
        };

        for (const entry of entries) register(entry.event, entry.frequency);
        return true;
    }

    private attachToClient(): void {
        for (const [eventName] of this.eventMap) {
            this.attachListener(eventName);
        }
    }

    private attachListener(eventName: ValidNonInteractionKeys): void {
        if (this.attachedEvents.has(eventName)) return;
        this.attachedEvents.add(eventName);

        const handlerEntries = this.eventMap.get(eventName);
        this.logger.debug(
            `Attaching ${paint.sky.bold(eventName)} to the client with ${paint.mute(handlerEntries?.length ?? 0)} handler(s)`
        );

        this.core.bot.client.on(eventName, (...args: ClientEvents[typeof eventName]) => {
            void this.inFlight.admit(() =>
                this.processEvent(eventName, args).catch((caught: unknown) => this.reportUnhandled(caught))
            );
        });
    }

    private reportUnhandled(caught: unknown): void {
        const error = asError(caught);
        this.logger.error(`[${paint.coral.bold('UNHANDLED ERROR AT ROOT')}] ${error.name}`, error.stack);
        this.core.bus[PublishDefault]('unhandledEventError', { error });
    }

    private async processEvent<KeyOfEvents extends ValidNonInteractionKeys>(
        eventName: KeyOfEvents,
        args: ClientEvents[KeyOfEvents]
    ): Promise<void> {
        const startedAt = performance.now();
        const handlerEntries = this.eventMap.get(eventName);
        if (!handlerEntries || handlerEntries.length === 0) return;

        const handlersToExecute = handlerEntries.filter((entry) => !this.onceRuns.isSpent(entry, eventName));

        if (handlersToExecute.length === 0) return;

        const dispatch = new DispatchContext('event', eventName);
        reportEventDispatching(this.core, dispatch.id, eventName, args);

        const ran: EventMiddleware[] = [];
        const handlers: HandlerResult[] = [];
        let stopped: { caught: unknown } | null = null;

        try {
            stopped =
                (await this.buildMembers(args, dispatch)) ??
                (await this.runMiddlewares(eventName, args, dispatch, ran));
            if (stopped) return;

            // another dispatch may have claimed a once handler during the runMiddlewares await
            const claimed = handlersToExecute.filter((entry) => this.onceRuns.claim(entry, eventName));
            const results = claimed.map((entry) => this.processHandler(eventName, entry.ctor, args, dispatch));
            handlers.push(...(await Promise.all(results)));
        } finally {
            const result = eventResultFor(stopped, handlers);
            reportEventDispatched(this.core, dispatch.id, eventName, result, startedAt);
            await runAfter(ran, result, this.logger);
        }
    }

    private async processHandler<KeyOfEvents extends ValidNonInteractionKeys>(
        eventName: KeyOfEvents,
        Ctor: EventHandlerConstructor,
        args: ClientEvents[KeyOfEvents],
        dispatch: DispatchContext
    ): Promise<HandlerResult> {
        try {
            this.logger.trace(`Processing ${paint.sky.bold(eventName)} with ${paint.mute(Ctor.name)}`);
            const handler = this.core[HostPlugins].assertMembersKept(
                // the event map paired this name with this class
                new (Ctor as ConstructableEventHandler)(args, this.core, dispatch),
                dispatch
            );
            const eventCtx = eventGateContext(eventName, args, this.core, dispatch);
            await runHandlerGates(Ctor, eventCtx);
            await handler.execute();
            return { handler: Ctor.name, outcome: 'handled' };
        } catch (caught) {
            handleEventFault(caught, { handlerName: Ctor.name, args, dispatch }, this.core);
            return { handler: Ctor.name, ...resultFor(caught) };
        }
    }
}
