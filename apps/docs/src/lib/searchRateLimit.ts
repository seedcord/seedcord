import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { Converters, Envapter } from 'envapt';

import type { RateLimitResult } from '@seedcord/types';
import type { NextRequest } from 'next/server';

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;
const WINDOW_MS = Envapter.getNumber('SEARCH_RATE_LIMIT_WINDOW_MS', DEFAULT_WINDOW_MS);
const LIMIT = Envapter.getNumber('SEARCH_RATE_LIMIT_MAX', DEFAULT_LIMIT);
const ALLOWED_ORIGIN_HOSTS = new Set(
    Envapter.getUsing('SEARCH_ALLOWED_ORIGIN_HOSTS', Converters.array(), ['docs.seedcord.org'])
);

// per-process, shared across requests like the docs engine's model cache
const limiter = new MemoryRateLimiter();

function requestOriginHost(request: NextRequest): string | null {
    const source = request.headers.get('origin') ?? request.headers.get('referer');
    if (!source) return null;
    try {
        return new URL(source).host;
    } catch {
        return null;
    }
}

// the docs UI's own /search calls carry an Origin or Referer on an allowlisted host, so they skip the limit.
function isAllowlistedOrigin(request: NextRequest): boolean {
    const host = requestOriginHost(request);
    return host !== null && ALLOWED_ORIGIN_HOSTS.has(host);
}

// cf-connecting-ip is set by Cloudflare on every edge request and a client can't forge it.
// x-forwarded-for covers a direct origin hit. null means no caller to key a bucket on.
function clientIp(request: NextRequest): string | null {
    const cf = request.headers.get('cf-connecting-ip');
    if (cf) return cf;
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim() || null;
}

// null when the request is exempt (the docs UI) or has no identifiable ip.
export async function checkSearchRateLimit(request: NextRequest): Promise<RateLimitResult | null> {
    if (isAllowlistedOrigin(request)) return null;
    const ip = clientIp(request);
    if (!ip) return null;
    return limiter.charge(`search:${ip}`, { windowMs: WINDOW_MS, limit: LIMIT });
}
