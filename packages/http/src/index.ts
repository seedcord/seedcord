export { createSeedcord } from './createSeedcord';
export type { EngineContext } from './createSeedcord';

export type {
    AutocompleteRoute,
    CommandRoute,
    ComponentRoute,
    RouteManifest,
    SubscriberRoute
} from './manifest/RouteManifest';

export type { Core } from '@interfaces/Core';

export type { SlashOptions } from '@inputs/SlashOptions';
export type { AutocompleteOptions } from '@seedcord/core/internal';

export * from './handlers';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
