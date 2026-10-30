import { KvRateLimiter } from '#src/rateLimiter/KvRateLimiter';

import { Kv } from './Kv';
import { MemoryDriver } from './MemoryDriver';

import type { IRateLimiter, KvDriver } from '@seedcord/types';

interface OpenedKv<TDriver extends KvDriver> {
    readonly kv: Kv<TDriver>;
    readonly rateLimiter: IRateLimiter;
}

export function openKv<TDriver extends KvDriver>(driver: TDriver | undefined): OpenedKv<TDriver> {
    // justified: TDriver defaults to KvDriver when config.kv is left out
    const root = new Kv((driver ?? new MemoryDriver()) as TDriver);
    return { kv: root.scope('app'), rateLimiter: new KvRateLimiter(root.scope('seedcord')) };
}
