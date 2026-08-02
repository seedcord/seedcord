import './subscriptions';

export { createSeedcord } from './createSeedcord';
export type { EngineContext } from './createSeedcord';

export type { RouteManifest } from './manifest/RouteManifest';

export type { Core } from '@interfaces/Core';
export type { HttpConfig, HttpEdgeConfig, HttpServerConfig } from '@interfaces/Config';

export type { SlashOptions } from '@inputs/SlashOptions';

export { Emojis } from '@src/emojis/EmojiInjector';
export type { InjectedEmojiMap, ResolvedEmoji } from '@src/emojis/EmojiInjector';

export * from '@seedcord/core';

export * from './handlers';
// two `export *` both re-export RepliableHandler, so export it explicitly to resolve to the http subclass
export { RepliableHandler } from '@handlers/RepliableHandler';

// same shadowing reason, these bind the transport Core into the two subscriber bases
export { Subscriber, WebhookLog } from '@subscribers/index';

export { Gated } from '@src/gates/Gated';
export type { InteractionGateContext } from '@src/gates/Gate';

export { version } from './version';
