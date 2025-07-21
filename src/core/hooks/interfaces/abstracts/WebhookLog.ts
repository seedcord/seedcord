import { HookHandler } from '../HookHandler';

import type { HookKeys } from '../../types/Hooks';
import type { WebhookClient } from 'discord.js';

export abstract class WebhookLog<T extends HookKeys> extends HookHandler<T> {
  abstract webhook: WebhookClient;
}
