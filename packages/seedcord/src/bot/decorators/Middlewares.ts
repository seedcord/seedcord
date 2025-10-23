import type { ClientEvents } from 'discord.js';

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
 */
export interface MiddlewareOptions {
    /**
     * Restrict event middleware execution to specific Discord client events
     */
    readonly events?: readonly (keyof ClientEvents)[];
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
    events?: readonly (keyof ClientEvents)[];
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
 * @throws A {@link TypeError} If priority is not a finite number
 * @throws An {@link Error} If interaction middleware specifies event filters
 */
export function Middleware(type: MiddlewareType, priority = 0, options: MiddlewareOptions = {}): ClassDecorator {
    return (ctor) => {
        const normalizedPriority = Number(priority);
        if (!Number.isFinite(normalizedPriority)) {
            throw new TypeError('Middleware priority must be a finite number');
        }

        if (type === MiddlewareType.Interaction && options.events?.length) {
            throw new Error('Interaction middleware cannot specify event filters');
        }

        const metadata: MiddlewareMetadata = {
            priority: normalizedPriority,
            type,
            ...(options.events ? { events: options.events } : {})
        };

        Reflect.defineMetadata(MiddlewareMetadataKey, metadata, ctor);
    };
}
