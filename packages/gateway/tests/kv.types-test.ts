import { expectTypeOf } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import type { GatewayConfig } from '#interfaces/Config';
import type { Kv, MemoryDriver } from '@seedcord/core';
import type { KvDriver, TypedOmit } from '@seedcord/types';

declare const config: GatewayConfig;
declare const driver: MemoryDriver;
declare const bare: TypedOmit<GatewayConfig, 'kv'>;

expectTypeOf(new Seedcord({ ...config, kv: driver }).kv).toEqualTypeOf<Kv<MemoryDriver>>();
expectTypeOf(new Seedcord(config).kv).toEqualTypeOf<Kv<KvDriver>>();

// @ts-expect-error a narrowed driver with no kv would hand back a MemoryDriver typed as that driver
void new Seedcord<MemoryDriver>(bare);
