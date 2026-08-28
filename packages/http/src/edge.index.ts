import 'reflect-metadata';
import './subscriptions';

export { createSeedcord } from './createSeedcord';
export type { EngineContext } from './createSeedcord';

export type { RouteManifest } from './manifest/RouteManifest';

export type { Core } from '#interfaces/Core';
export type { HttpConfig, HttpEdgeConfig, HttpServerConfig } from '#interfaces/Config';

export type { SlashOptions } from '#inputs/SlashOptions';

export { ModalFields } from '#inputs/ModalFields';
export type { SelectedMentionables } from '#inputs/ModalFields';

export { Emojis } from '#src/emojis/EmojiInjector';
export type { InjectedEmojiMap } from '#src/emojis/EmojiInjector';

export * from '@seedcord/core';
export * from '@seedcord/errors';
export * from '@seedcord/event-emitter';
export * from '@seedcord/logger';
export * from '@seedcord/rate-limiter';
export type * from '@seedcord/types';
export * from '@seedcord/utils';

export * from './handlers';
// two `export *` both re-export RepliableHandler, so export it explicitly to resolve to the http subclass
export { RepliableHandler } from '#handlers/RepliableHandler';

export { ReplySender } from '#reply/ReplySender';
export type { InteractionRef, SentMessage } from '#reply/ReplySender';

// same shadowing reason, these bind the transport Core into the two subscriber bases
export { Subscriber, WebhookLog } from '#subscribers/index';

export * from '#src/pagination/index';

export { Gated } from '#src/gates/Gated';
export type { InteractionGateContext } from '#src/gates/Gate';

export { version } from './version';
