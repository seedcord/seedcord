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

// Effects exports
export * from '@effects/index';

// HMR exports
export * from '@hmr/index';

// Export seedcord
export * from './Seedcord';

// Export other packages
export * from '@seedcord/services';
export type * from '@seedcord/types';
export * from '@seedcord/utils';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
