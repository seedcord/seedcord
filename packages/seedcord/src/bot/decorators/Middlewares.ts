import { SeedcordError, SeedcordErrorCode, SeedcordTypeError } from '@seedcord/services';

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
export interface MiddlewareOptions<MType extends MiddlewareType> {
    /**
     * Restrict event middleware execution to specific Discord client events
     */
    readonly events?: MType extends MiddlewareType.Event ? readonly ValidNonInteractionKeys[] : never;
}

/**
 * Metadata stored for middleware registration
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
export function Middleware<MType extends MiddlewareType>(
    type: MType,
    priority = 0,
    options: MiddlewareOptions<MType> = {}
) {
    return (
        ctor: Constructor<
            MType extends MiddlewareType.Interaction
                ? InteractionMiddleware<Repliables>
                : EventMiddleware<ValidNonInteractionKeys>
        >
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
