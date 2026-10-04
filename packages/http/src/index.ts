import 'reflect-metadata';

export * from './edge.index';
export { Seedcord } from '#src/node/Seedcord';

export { WinstonConsoleSink, WinstonFileSink } from '@seedcord/logger/node';

export { Plugin } from './Plugin';
export type { HttpPluginOptions, PluginLifecycleSpec, PluginOptions } from './Plugin';
