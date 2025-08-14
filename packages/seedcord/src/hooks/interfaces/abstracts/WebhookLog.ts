import { HookHandler } from '../HookHandler';

import type { Core } from '../../../interfaces/Core';
import type { AllHooks, HookKeys } from '../../types/Hooks';
import type { WebhookClient } from 'discord.js';

export abstract class WebhookLog<KeyofHooks extends HookKeys> extends HookHandler<KeyofHooks> {
  abstract webhook: WebhookClient;

  constructor(data: AllHooks[KeyofHooks], core: Core) {
    super(data, core);
  }
}
