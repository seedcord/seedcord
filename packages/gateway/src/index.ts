import 'reflect-metadata';
import './logger-bootstrap';
import './plugin-capabilities';

export type { BotEvents } from '@bot/Bot';

export * from '@bDecorators/index';

export * from '@bot/gates';

export * from '@bot/injectors/index';

export * from '@bUtilities/index';

export { getConfirmation } from '@bot/confirm';
export type { ConfirmOptions, DefaultConfirmOptions } from '@bot/confirm';

export type * from '@interfaces/index';

export * from '@handlers/index';
// @handlers/index and @seedcord/core both export RepliableHandler so this explicit export is needed
export { RepliableHandler } from '@handlers/RepliableHandler';

export * from '@pagination/index';

export type * from '@inputs/index';

// after the core star below, these bind the transport Core into the two subscriber bases
export { Subscriber, WebhookLog } from '@subscribers/index';

export * from './Seedcord';

// Exports from other packages
export * from '@seedcord/core';
export * from '@seedcord/errors';
export * from '@seedcord/event-emitter';
export * from '@seedcord/logger';
export * from '@seedcord/rate-limiter';
export type * from '@seedcord/types';
export * from '@seedcord/utils';

export { version } from './version';
