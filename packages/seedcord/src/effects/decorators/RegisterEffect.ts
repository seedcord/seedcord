import type { EffectKeys } from '../types/Effects';
import type { Constructor } from 'type-fest';

/**
 * Metadata key used to store effect handler information
 *
 * @internal
 */
export const EffectMetadataKey = Symbol('effect:metadata');

/**
 * Registers a side effect handler class with a specific side effect event.
 *
 * Associates the decorated class with a side effect event type for automatic
 * registration and execution when the side effect is emitted.
 *
 * @typeParam TEffect - The side effect event name to register for
 * @param effect - The side effect event name to register for
 * @decorator
 * @example
 * ```typescript
 * \@RegisterEffect('userJoin')
 * class WelcomeHandler extends EffectHandler<'userJoin'> {
 *   async execute() {
 *     // Handle user join event
 *   }
 * }
 * ```
 */
export function RegisterEffect<TEffect extends EffectKeys>(effect: TEffect) {
    return function (constructor: Constructor<unknown>): void {
        Reflect.defineMetadata(EffectMetadataKey, effect, constructor);
    };
}
