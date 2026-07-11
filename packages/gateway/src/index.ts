import 'reflect-metadata';
import './logger-bootstrap';

// Bot export
export type { BotEvents } from '@bot/Bot';

// Bot decorators exports
export * from '@bDecorators/index';

// Bot gates exports
export * from '@bot/gates';

// Bot Injectors exports
export * from '@bot/injectors/index';

// Bot Utilities exports
export * from '@bUtilities/index';

// Reply delivery
export { ReplySender } from '@bot/ReplySender';

// Confirmation prompts
export { getConfirmation } from '@bot/confirm';
export type { ConfirmOptions, DefaultConfirmOptions } from '@bot/confirm';

// Interfaces exports
export * from '@interfaces/index';

// Handlers exports
export * from '@handlers/index';

// Pagination exports
export * from '@pagination/index';

// Inputs exports
export type * from '@inputs/index';

// Pub/Sub exports
export * from '@subscribers/index';

// Export seedcord
export * from './Seedcord';

// Export other packages
export * from '@seedcord/core';
export * from '@seedcord/errors';
export * from '@seedcord/event-emitter';
export * from '@seedcord/logger';
export * from '@seedcord/rate-limiter';
export * from '@seedcord/services';
export type * from '@seedcord/types';
export * from '@seedcord/utils';

export { version } from './version';
