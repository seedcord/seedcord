import { describe, expect, it } from 'vitest';

import { checkSearchRateLimit } from '#lib/searchRateLimit';

import type { NextRequest } from 'next/server';

// justified: the route reads request.headers only. a real NextRequest pulls in Next internals.
function req(headers: Record<string, string> = {}): NextRequest {
    return { headers: new Headers(headers) } as unknown as NextRequest;
}

async function chargeUntilLimited(headers: Record<string, string>): Promise<boolean> {
    for (let i = 0; i < 200; i += 1) {
        const result = await checkSearchRateLimit(req(headers));
        if (result.limited) return true;
    }
    return false;
}

describe('checkSearchRateLimit', () => {
    it('rate-limits a request that forges the docs origin', async () => {
        const headers = { 'cf-connecting-ip': 'forged-origin', origin: 'https://docs.seedcord.org' };
        expect(await chargeUntilLimited(headers)).toBe(true);
    });

    it('rate-limits a foreign-origin request once its window fills', async () => {
        expect(await chargeUntilLimited({ 'cf-connecting-ip': 'ip-foreign', origin: 'https://evil.example' })).toBe(
            true
        );
    });

    it('tracks cloudflare ips independently', async () => {
        await chargeUntilLimited({ 'cf-connecting-ip': 'ip-exhausted' });
        const fresh = await checkSearchRateLimit(req({ 'cf-connecting-ip': 'ip-fresh' }));
        expect(fresh.limited).toBe(false);
    });

    it('shares one bucket across unproxied requests regardless of x-forwarded-for', async () => {
        await chargeUntilLimited({ 'x-forwarded-for': 'hop-a' });
        const rotated = await checkSearchRateLimit(req({ 'x-forwarded-for': 'hop-b' }));
        expect(rotated.limited).toBe(true);
    });

    it('charges a headerless request into the shared unproxied bucket', async () => {
        expect(await chargeUntilLimited({})).toBe(true);
    });

    it('keeps the shared bucket out of the cloudflare buckets', async () => {
        const proxied = await checkSearchRateLimit(req({ 'cf-connecting-ip': 'ip-alone' }));
        expect(proxied.limited).toBe(false);
    });
});
