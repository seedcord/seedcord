export { FRAMEWORK_CHANNELS } from './channels';
export { Logger } from './Logger';
export { LoggerChannelRegistry } from './LoggerChannelRegistry';
export { ObjectConsoleSink } from './ObjectConsoleSink';
export { LEVEL_COLOR } from './palette';

export type { LoggerOptions } from './types';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
