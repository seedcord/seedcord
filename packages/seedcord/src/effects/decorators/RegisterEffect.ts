import type { EventFrequency } from '../../types';
import type { EffectKeys } from '../types/Effects';
import type { Constructor } from 'type-fest';

/**
 * Metadata key used to store effect handler information
 *
 * @internal
 */
export const EffectMetadataKey = Symbol('effect:metadata');

/**
 * Options accepted by the `@RegisterEffect` decorator.
 */
export interface RegisterEffectOptions {
    /** Frequency: `'once'` or `'on'`. Defaults to `'on'`. */
    readonly frequency?: EventFrequency | undefined;
}

/**
 * Metadata entry representing a registered effect handler.
 *
 * @internal
 */
export interface RegisterEffectMetadataEntry {
    /** The effect event name to register for. */
    readonly effect: EffectKeys;
    /** Frequency: `'once'` or `'on'`. Defaults to `'on'`. */
    readonly frequency?: EventFrequency | undefined;
}

/**
 * Registers a side effect handler class with a specific side effect event.
 *
 * Associates the decorated class with a side effect event type for automatic
 * registration and execution when the side effect is emitted.
 *
 * @typeParam TEffect - The side effect event name to register for
 * @param effect - The side effect event name to register for
 * @param options - Options to configure the effect handler registration.
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
 * @example
 * ```ts
 * \@RegisterEffect('userJoin', { frequency: 'once' })
 * // or
 * \@RegisterEffect('userJoin')
 * ```
 */
export function RegisterEffect<TEffect extends EffectKeys>(effect: TEffect, options?: RegisterEffectOptions) {
    return function (constructor: Constructor<unknown>): void {
        const meta: RegisterEffectMetadataEntry = {
            effect,
            frequency: options?.frequency
        };

        Reflect.defineMetadata(EffectMetadataKey, meta, constructor);
    };
}
