export { createSeedcord } from './createSeedcord';
export type { EngineContext } from './createSeedcord';

export type { RouteManifest } from './manifest/RouteManifest';

export type { Core } from '@interfaces/Core';

export type { SlashOptions } from '@inputs/SlashOptions';

export * from '@seedcord/core';

export * from './handlers';
// the core and ./handlers `export *` lines both have a RepliableHandler, and es modules drop a name
// exported by two stars, so this explicit export keeps the http subclass on the barrel
export { RepliableHandler } from '@handlers/RepliableHandler';

export { Gated } from '@src/gates/Gated';
export type { InteractionGateContext } from '@src/gates/Gate';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
