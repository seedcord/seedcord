import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError, SeedcordTypeError } from '@seedcord/services/internal';

import type { EventMiddleware, InteractionMiddleware, Repliables, ValidNonInteractionKeys } from '@interfaces/Handler';
import type { Constructor } from 'type-fest';

/**
 * Middleware types supported by Seedcord
 */
export enum MiddlewareType {
    Interaction = 'middleware:interaction',
    Event = 'middleware:event'
}

/**
 * Metadata key for middleware configuration
 *
 * @internal
 */
export const MiddlewareMetadataKey = Symbol('middleware:metadata');

/**
 * Additional middleware registration options
 *
 * @typeParam MType - The type of middleware being registered
 */
export interface MiddlewareOptions<
    MType extends MiddlewareType,
    Events extends readonly ValidNonInteractionKeys[] = readonly ValidNonInteractionKeys[]
> {
    /**
     * Restrict event middleware execution to specific Discord client events. The middleware's `EventMiddleware`
     * generic must list the same events, or applying the decorator is a compile error.
     */
    readonly events?: MType extends MiddlewareType.Event ? Events : never;
}

/**
 * Metadata stored for middleware registration
 *
 * @internal
 */
export interface MiddlewareMetadata {
    /**
     * Priority number used to order middleware
     */
    priority: number;
    /**
     * Middleware kind from {@link MiddlewareType}
     */
    type: MiddlewareType;
    /**
     * Optional list of Discord client events to target
     */
    events?: readonly ValidNonInteractionKeys[];
}

/**
 * Decorator used to register middleware with priority ordering. The lower the priority number, the earlier it runs.
 *
 * Interaction middleware cannot specify event filters.
 *
 * @param type - Middleware kind from {@link MiddlewareType}
 * @param priority - Ordering value where lower runs earlier. Default is 0
 * @param options - Additional registration options
 *
 * @decorator
 *
 * @example
 * ```ts
 * \@Middleware(MiddlewareType.Event, 10, { events: [Events.MessageCreate, Events.MessageUpdate] })
 * class MyEventMiddleware extends EventMiddleware {}
 * ```
 * @throws A {@link SeedcordTypeError} If priority is not a finite number
 * @throws A {@link SeedcordError} If interaction middleware specifies event filters
 */
export function Middleware<MType extends MiddlewareType, const Events extends readonly ValidNonInteractionKeys[] = []>(
    type: MType,
    priority = 0,
    options: MiddlewareOptions<MType, Events> = {}
) {
    return (
        ctor: MType extends MiddlewareType.Interaction
            ? Constructor<InteractionMiddleware<Repliables>>
            : Events extends readonly []
              ? Constructor<EventMiddleware<ValidNonInteractionKeys>>
              : Constructor<EventMiddleware<Events[number]>>
    ): void => {
        const normalizedPriority = Number(priority);
        if (!Number.isFinite(normalizedPriority)) {
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority);
        }

        if (type === MiddlewareType.Interaction && Array.isArray(options.events) && options.events.length > 0) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorInteractionEventFilter);
        }

        const metadata: MiddlewareMetadata = {
            priority: normalizedPriority,
            type,
            ...(options.events ? { events: options.events } : {})
        };

        Reflect.defineMetadata(MiddlewareMetadataKey, metadata, ctor);
    };
}
