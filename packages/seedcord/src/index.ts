import 'reflect-metadata';

// Bot export
export type { BotEvents } from '@bot/Bot';

// Bot decorators exports
export * from '@bDecorators/index';

// Bot Injectors exports
export * from '@bot/injectors/index';

// Bot Utilities exports
export * from '@bUtilities/index';

// Interfaces exports
export * from '@interfaces/index';

// Handlers exports
export * from '@handlers/index';

// Inputs exports
export type * from '@inputs/index';

// CustomId codec exports
export * from '@customId/index';

// Pub/Sub exports
export * from '@subscribers/index';

// HMR exports
export * from '@hmr/index';

// Export seedcord
export * from './Seedcord';

// Export other packages
export * from '@seedcord/errors';
export * from '@seedcord/services';
export type * from '@seedcord/types';
export * from '@seedcord/utils';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
