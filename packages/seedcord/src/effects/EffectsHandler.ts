import { Logger } from '@seedcord/services';

import type { EffectKeys, AllEffects } from './types/Effects';
import type { Core } from '@interfaces/Core';

/**
 * Abstract base class for handling application side effects.
 *
 * Provides type-safe access to effects data and the core framework instance.
 * Extend this class to create custom side effect handlers.
 *
 * @typeParam KeyOfEffects - The specific side effect type this handler processes
 */
export abstract class EffectsHandler<KeyOfEffects extends EffectKeys> {
    protected readonly logger: Logger;

    /**
     * Creates a new effects handler instance.
     *
     * @param data - The effect event data
     * @param core - The core framework instance
     */
    constructor(
        protected readonly data: AllEffects[KeyOfEffects],
        protected readonly core: Core
    ) {
        this.data = data;
        this.core = core;
        this.logger = new Logger(this.constructor.name);
    }

    /**
     * Executes the effect handler logic.
     * @virtual Override this method in your handler classes
     */
    abstract execute(): Promise<void>;
}
