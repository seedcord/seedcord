import { WebhookClient } from 'discord.js';
import { HookHandler } from '../HookHandler';
import { HookedEvents } from '../Hooks';

export abstract class WebhookLog<T extends keyof HookedEvents> extends HookHandler<T> {
  abstract webhook: WebhookClient;
}
