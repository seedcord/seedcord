import { openKv } from '#src/kv/openKv';

import type { IRateLimiter } from '@seedcord/types';

export function memoryRateLimiter(): IRateLimiter {
    return openKv(undefined).rateLimiter;
}
