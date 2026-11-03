import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';
import { KvRateLimiter } from '#src/rateLimiter/KvRateLimiter';

import type { IRateLimiter } from '@seedcord/types';

export function memoryRateLimiter(): IRateLimiter {
    return new KvRateLimiter(new Kv(new MemoryDriver()));
}
