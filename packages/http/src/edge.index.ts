import './plugin-capabilities';

export { createSeedcord } from './createSeedcord';
export type { EngineContext } from './createSeedcord';

export type { RouteManifest } from './manifest/RouteManifest';

export type { Core } from '@interfaces/Core';
export type { HttpConfig, HttpEdgeConfig, HttpServerConfig } from '@interfaces/Config';

export type { SlashOptions } from '@inputs/SlashOptions';

export * from '@seedcord/core';

export * from './handlers';
// two `export *` both re-export RepliableHandler, so export it explicitly to resolve to the http subclass
export { RepliableHandler } from '@handlers/RepliableHandler';

export { Gated } from '@src/gates/Gated';
export type { InteractionGateContext } from '@src/gates/Gate';

export { version } from './version';
