import { WebhookClient } from 'discord.js';
import { HookHandler } from '../HookHandler';
import { HookKeys } from '../../types/Hooks';

export abstract class WebhookLog<T extends HookKeys> extends HookHandler<T> {
  abstract webhook: WebhookClient;
}
