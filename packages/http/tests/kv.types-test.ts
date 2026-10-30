import { expectTypeOf } from 'vitest';

import { Seedcord as EdgeSeedcord } from '#src/edge/Seedcord';
import { Seedcord } from '#src/node/Seedcord';

import type { HttpEdgeConfig, HttpServerConfig } from '#interfaces/Config';
import type { Kv, MemoryDriver } from '@seedcord/core';
import type { KvDriver, TypedOmit } from '@seedcord/types';

declare const server: HttpServerConfig;
declare const edge: HttpEdgeConfig;
declare const driver: MemoryDriver;
declare const bareServer: TypedOmit<HttpServerConfig, 'kv'>;
declare const bareEdge: TypedOmit<HttpEdgeConfig, 'kv'>;

expectTypeOf(new Seedcord({ ...server, kv: driver }).kv).toEqualTypeOf<Kv<MemoryDriver>>();
expectTypeOf(new Seedcord(server).kv).toEqualTypeOf<Kv<KvDriver>>();
expectTypeOf(new EdgeSeedcord({ ...edge, kv: driver }).kv).toEqualTypeOf<Kv<MemoryDriver>>();

// @ts-expect-error a narrowed driver with no kv would hand back a MemoryDriver typed as that driver
void new Seedcord<MemoryDriver>(bareServer);
// @ts-expect-error a narrowed driver with no kv would hand back a MemoryDriver typed as that driver
void new EdgeSeedcord<MemoryDriver>(bareEdge);
