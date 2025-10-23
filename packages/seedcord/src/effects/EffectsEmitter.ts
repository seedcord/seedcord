import { EventEmitter } from 'node:events';

import type { AllEffects, EffectKeys } from './types/Effects';

/**
 * Type-safe event emitter for application effects.
 *
 * Provides a strongly-typed wrapper around Node.js EventEmitter
 * for Seedcord's effect system.
 *
 * @typeParam AllEffects - Side effect definitions mapping event names to data types
 *
 * @internal
 */
export class EffectsEmitter {
    private readonly emitter = new EventEmitter();

    /**
     * Registers a listener for the specified side effect.
     *
     * @typeParam KeyOfEffects - The side effect name type
     * @param event - The side effect name to listen for
     * @param listener - Function to call when the event is emitted
     * @returns This EffectsEmitter instance for chaining
     */
    public on<KeyOfEffects extends EffectKeys>(
        event: KeyOfEffects,
        listener: (data: AllEffects[KeyOfEffects]) => void
    ): this {
        this.emitter.on(event, listener);
        return this;
    }

    /**
     * Registers a one-time listener for the specified side effect.
     *
     * @typeParam KeyOfEffects - The side effect name type
     * @param event - The side effect name to listen for once
     * @param listener - Function to call when the event is emitted
     * @returns This EffectsEmitter instance for chaining
     */
    public once<KeyOfEffects extends EffectKeys>(
        event: KeyOfEffects,
        listener: (data: AllEffects[KeyOfEffects]) => void
    ): this {
        this.emitter.once(event, listener);
        return this;
    }

    /**
     * Emits a side effect with the provided data.
     *
     * @typeParam KeyOfEffects - The side effect name type
     * @param event - The side effect name to emit
     * @param data - The data to pass to registered listeners
     * @returns True if the event had listeners, false otherwise
     */
    public emit<KeyOfEffects extends EffectKeys>(event: KeyOfEffects, data: AllEffects[KeyOfEffects]): boolean {
        return this.emitter.emit(event, data);
    }
}
