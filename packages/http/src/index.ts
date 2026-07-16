export { createSeedcord } from './createSeedcord';
export type { EngineContext } from './createSeedcord';

export type { RouteManifest } from './manifest/RouteManifest';

export type { Core } from '@interfaces/Core';

export type { SlashOptions } from '@inputs/SlashOptions';
export type { AutocompleteOptions } from '@seedcord/core';
export {
    AutocompleteRoute,
    ButtonRoute,
    ContextMenuRoute,
    ModalRoute,
    SelectMenuRoute,
    SlashRoute
} from '@seedcord/core';

export * from './handlers';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
