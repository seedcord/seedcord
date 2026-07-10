import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { Envapter } from 'envapt';

import type { RateLimitResult } from '@seedcord/types';
import type { NextRequest } from 'next/server';

const DEFAULT_WINDOW_MS = 60_000;
// generous enough that the debounced docs UI never fills it
const DEFAULT_LIMIT = 120;
const WINDOW_MS = Envapter.getNumber('SEARCH_RATE_LIMIT_WINDOW_MS', DEFAULT_WINDOW_MS);
const LIMIT = Envapter.getNumber('SEARCH_RATE_LIMIT_MAX', DEFAULT_LIMIT);

// per-process, shared across requests like the docs engine's model cache
const limiter = new MemoryRateLimiter();

// cf-connecting-ip is set by Cloudflare and a client can't forge it. every other identity
// header (origin, referer, x-forwarded-for) is client-controlled, so unproxied traffic
// shares one bucket.
export async function checkSearchRateLimit(request: NextRequest): Promise<RateLimitResult> {
    const cfIp = request.headers.get('cf-connecting-ip');
    const key = cfIp ? `search:${cfIp}` : 'search:unproxied';
    return limiter.charge(key, { windowMs: WINDOW_MS, limit: LIMIT });
}
