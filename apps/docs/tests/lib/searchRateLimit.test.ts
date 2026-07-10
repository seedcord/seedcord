import { describe, expect, it } from 'vitest';

import { checkSearchRateLimit } from '@lib/searchRateLimit';

import type { NextRequest } from 'next/server';

// justified: the route reads request.headers only. a real NextRequest pulls in Next internals.
function req(headers: Record<string, string> = {}): NextRequest {
    return { headers: new Headers(headers) } as unknown as NextRequest;
}

// 200 sits well above the default window limit, so a non-exempt caller reaches its cap inside the loop
async function chargeUntilLimited(headers: Record<string, string>): Promise<boolean> {
    for (let i = 0; i < 200; i += 1) {
        const result = await checkSearchRateLimit(req(headers));
        if (result?.limited) return true;
    }
    return false;
}

describe('checkSearchRateLimit', () => {
    it('leaves a request with no identifiable ip unlimited', async () => {
        expect(await checkSearchRateLimit(req())).toBeNull();
    });

    it('leaves an allowlisted docs-origin request unlimited even with an ip', async () => {
        const headers = { 'cf-connecting-ip': 'allow-origin', origin: 'https://docs.seedcord.org' };
        for (let i = 0; i < 200; i += 1) expect(await checkSearchRateLimit(req(headers))).toBeNull();
    });

    it('allowlists the docs host through the Referer', async () => {
        const headers = {
            'cf-connecting-ip': 'allow-ref',
            referer: 'https://docs.seedcord.org/packages/seedcord/latest'
        };
        expect(await checkSearchRateLimit(req(headers))).toBeNull();
    });

    it('rate-limits a foreign-origin request once its window fills', async () => {
        expect(await chargeUntilLimited({ 'cf-connecting-ip': 'ip-foreign', origin: 'https://evil.example' })).toBe(
            true
        );
    });

    it('rate-limits a request that carries no origin', async () => {
        expect(await chargeUntilLimited({ 'cf-connecting-ip': 'ip-no-origin' })).toBe(true);
    });

    it('does not exempt a malformed origin', async () => {
        expect(await chargeUntilLimited({ 'cf-connecting-ip': 'ip-bad-origin', origin: 'not-a-url' })).toBe(true);
    });

    it('tracks ips independently', async () => {
        await chargeUntilLimited({ 'cf-connecting-ip': 'ip-exhausted' });
        const fresh = await checkSearchRateLimit(req({ 'cf-connecting-ip': 'ip-fresh' }));
        expect(fresh?.limited).toBe(false);
    });

    it('keys on cf-connecting-ip ahead of x-forwarded-for', async () => {
        await chargeUntilLimited({ 'cf-connecting-ip': 'cf-ip', 'x-forwarded-for': 'xff-ip' });
        expect((await checkSearchRateLimit(req({ 'cf-connecting-ip': 'cf-ip' })))?.limited).toBe(true);
        expect((await checkSearchRateLimit(req({ 'x-forwarded-for': 'xff-ip' })))?.limited).toBe(false);
    });

    it('falls back to the first x-forwarded-for hop when cf-connecting-ip is absent', async () => {
        await chargeUntilLimited({ 'x-forwarded-for': 'hop-1, hop-2' });
        expect((await checkSearchRateLimit(req({ 'cf-connecting-ip': 'hop-1' })))?.limited).toBe(true);
    });
});
