import 'reflect-metadata';
import './subscriptions';

// both entries export this module, each with its own Seedcord beside it

export type { EngineContext } from './requestScope';

export { Plugin } from './Plugin';
export type { HttpPluginOptions, PluginLifecycleSpec, PluginOptions } from './Plugin';

export type { Core } from '#interfaces/Core';
export type { HttpConfig, HttpEdgeConfig, HttpServerConfig } from '#interfaces/Config';

export type { SlashOptions } from '#inputs/SlashOptions';

export { ModalFields } from '#inputs/ModalFields';
export type { SelectedMentionables } from '#inputs/ModalFields';

export { Emojis } from '#src/emojis/EmojiInjector';
export type { InjectedEmojiMap } from '#src/emojis/EmojiInjector';

export type { API } from '@discordjs/core/http-only';
export * from '@seedcord/core';
export { FolderExports, type AttachedPlugin, type Generated, type PluginTypes } from '@seedcord/core/plugin';
export * from '@seedcord/errors';
export * from '@seedcord/event-emitter';
export * from '@seedcord/logger';
export type * from '@seedcord/types';
export * from '@seedcord/utils';

export * from './handlers';
// export RepliableHandler explicitly to resolve to the http subclass because two `export *` both re-export it
export { RepliableHandler } from '#handlers/RepliableHandler';

export { ReplySender } from '#reply/ReplySender';
export type { InteractionRef, SentMessage } from '#reply/ReplySender';

// same shadowing reason, these bind the transport Core into the two subscriber bases
export { Subscriber, WebhookLog } from '#subscribers/index';

export * from '#src/pagination/index';

export { Gated } from '#src/gates/Gated';
export type { InteractionGateContext } from '#src/gates/Gate';

export { version } from './version';
