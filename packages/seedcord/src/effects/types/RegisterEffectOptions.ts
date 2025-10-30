import type { EffectKeys } from './Effects';

/**
 * Options accepted by the `@RegisterEffect` decorator.
 */
export interface RegisterEffectOptions {
    /** The effect event name to register for. (Not to be passed in options directly)*/
    effect: EffectKeys;
    /** Frequency: `'once'` or `'on'`. Defaults to `'on'`. */
    frequency?: 'once' | 'on' | undefined;
}
