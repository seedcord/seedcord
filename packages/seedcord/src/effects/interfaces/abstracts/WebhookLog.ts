import { EffectsHandler } from '../EffectsHandler';

import type { Core } from '../../../interfaces/Core';
import type { AllEffects, EffectKeys } from '../../types/Effects';
import type { WebhookClient } from 'discord.js';

/**
 * Abstract webhook logging handler for side effect events.
 *
 * Extends EffectsHandler to provide webhook-based logging capabilities.
 * Implementations must define the webhook client to send messages to.
 *
 * @typeParam KeyOfEffects - The specific side effect type this handler processes
 */
export abstract class WebhookLog<KeyOfEffects extends EffectKeys> extends EffectsHandler<KeyOfEffects> {
    /** The Discord webhook client for sending log messages */
    abstract webhook: WebhookClient;

    constructor(data: AllEffects[KeyOfEffects], core: Core) {
        super(data, core);
    }
}
