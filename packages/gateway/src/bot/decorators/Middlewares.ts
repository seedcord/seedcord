import { EventMiddlewareMetadataKey } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { EventMiddleware } from '#handlers/event';
import type { ValidNonInteractionKeys } from '#src/handlers/interactionTypes';
import type { Constructor, NonEmptyTuple } from 'type-fest';

/** Registration options for an event middleware. */
export interface EventMiddlewareOptions<Events extends NonEmptyTuple<ValidNonInteractionKeys>> {
    /**
     * Restrict this middleware to certain Discord client events. The middleware's `EventMiddleware`
     * generic must list the same events, or applying the decorator is a compile error. Omit it to run on
     * every event.
     */
    readonly events?: Events;
    /** Lower runs earlier. Two middleware sharing a priority run in registration order.
     *
     * @defaultValue 0
     */
    readonly priority?: number;
}

/** @internal */
export interface EventMiddlewareMetadata {
    readonly priority: number;
    readonly events?: readonly ValidNonInteractionKeys[];
}

/**
 * Registers an event middleware. It runs before the handlers for every event it lists.
 *
 * @param options - The events this middleware runs on and its ordering.
 * @decorator
 *
 * @example
 * ```ts
 * \@RegisterEventMiddleware({ events: [Events.MessageCreate], priority: 10 })
 * class Audit extends EventMiddleware<Events.MessageCreate> {
 *     async execute() {
 *         this.logger.info(this.event[0].id);
 *     }
 * }
 * ```
 *
 * @throws A **SeedcordTypeError** when `priority` is not a finite number.
 */
export function RegisterEventMiddleware<
    const Events extends NonEmptyTuple<ValidNonInteractionKeys> = NonEmptyTuple<ValidNonInteractionKeys>
>(options: EventMiddlewareOptions<Events> = {}) {
    return function (ctor: Constructor<EventMiddleware<Events[number]>>): void {
        const priority = Number(options.priority ?? 0);
        if (!Number.isFinite(priority)) {
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority, [
                ctor.name,
                String(options.priority)
            ]);
        }
        if (options.events?.length === 0) {
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorEmptyMiddlewareFilter, [ctor.name, 'events']);
        }

        const metadata: EventMiddlewareMetadata = {
            priority,
            ...(options.events && { events: options.events })
        };

        Reflect.defineMetadata(EventMiddlewareMetadataKey, metadata, ctor);
    };
}

/** @internal */
export function eventMiddlewareMetaOf(constructor: object): EventMiddlewareMetadata | undefined {
    const saved: unknown = Reflect.getMetadata(EventMiddlewareMetadataKey, constructor);
    return saved as EventMiddlewareMetadata | undefined;
}
