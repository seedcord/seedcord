import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexJson } from '@seedcord/docs-engine';

const INDEX: IndexJson = {
    schemaVersion: 1,
    updatedAt: '2026-09-25T00:00:00.000Z',
    pathTemplates: { stable: '{name}/{version}.json', prerelease: '{name}/next.json' },
    packages: {
        gateway: {
            fullName: '@seedcord/gateway',
            stable: {
                latest: '0.7.1',
                latestByMinor: { '0.6': '0.6.2', '0.7': '0.7.1' },
                latestByMajor: { '0': '0.7.1' }
            },
            prerelease: null
        }
    }
};

const fetchIndex = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

// a real fetch hangs on a stalled cdn and rejects once its signal aborts
function stalledFetch(_url: string, init?: RequestInit): Promise<Response> {
    return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
        });
    });
}

function passedThrough(res: Response): boolean {
    return res.headers.get('x-middleware-next') === '1';
}

async function freshProxy(): Promise<(url: string) => Promise<Response>> {
    vi.resetModules();
    const { proxy } = await import('#src/proxy');
    return (url) => proxy(new NextRequest(url));
}

beforeEach(() => {
    vi.stubEnv('SEEDCORD_DOCS_INDEX_URL', 'https://cdn.seedcord.org/index.json');
    vi.stubGlobal('fetch', fetchIndex);
    fetchIndex.mockReset();
    fetchIndex.mockImplementation(() => Promise.resolve(Response.json(INDEX)));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('proxy', () => {
    it('redirects an unlisted patch to the newest patch of its minor, keeping the rest of the url', async () => {
        const proxy = await freshProxy();
        const res = await proxy('https://docs.seedcord.org/packages/gateway/0.6.0/functions/gated?tab=api');

        expect(res.status).toBe(308);
        expect(res.headers.get('location')).toBe(
            'https://docs.seedcord.org/packages/gateway/0.6.2/functions/gated?tab=api'
        );
    });

    it('redirects an unlisted package overview', async () => {
        const proxy = await freshProxy();
        const res = await proxy('https://docs.seedcord.org/packages/gateway/0.7.0');

        expect(res.headers.get('location')).toBe('https://docs.seedcord.org/packages/gateway/0.7.1');
    });

    it.each(['.md', '.png'])('redirects the %s twin of an unlisted package overview', async (extension) => {
        const proxy = await freshProxy();
        const res = await proxy(`https://docs.seedcord.org/packages/gateway/0.6.0${extension}`);

        expect(res.headers.get('location')).toBe(`https://docs.seedcord.org/packages/gateway/0.6.2${extension}`);
    });

    it('passes a version the index still serves through', async () => {
        const proxy = await freshProxy();

        expect(passedThrough(await proxy('https://docs.seedcord.org/packages/gateway/0.6.2/classes/x'))).toBe(true);
    });

    it('passes latest through without loading the index', async () => {
        const proxy = await freshProxy();

        expect(passedThrough(await proxy('https://docs.seedcord.org/packages/gateway/latest/functions/gated'))).toBe(
            true
        );
        expect(fetchIndex).not.toHaveBeenCalled();
    });

    it('passes a package the index does not list through', async () => {
        const proxy = await freshProxy();

        expect(passedThrough(await proxy('https://docs.seedcord.org/packages/nope/0.1.0'))).toBe(true);
    });

    it('passes the request through when the index fails to load', async () => {
        fetchIndex.mockImplementation(() => Promise.resolve(new Response(null, { status: 503 })));
        const proxy = await freshProxy();

        expect(passedThrough(await proxy('https://docs.seedcord.org/packages/gateway/0.6.0'))).toBe(true);
    });

    it('passes the request through when the index takes too long to load', async () => {
        vi.useFakeTimers();
        fetchIndex.mockImplementation(stalledFetch);
        const proxy = await freshProxy();

        const pending = proxy('https://docs.seedcord.org/packages/gateway/0.6.0');
        await vi.advanceTimersByTimeAsync(10_000);

        expect(passedThrough(await pending)).toBe(true);
    });

    it('passes the request through when a read that ignores its abort signal stalls', async () => {
        vi.useFakeTimers();
        // readFile on the local file:// index is one of these
        fetchIndex.mockImplementation(() => new Promise<Response>(() => undefined));
        const proxy = await freshProxy();

        const pending = proxy('https://docs.seedcord.org/packages/gateway/0.6.0');
        await vi.advanceTimersByTimeAsync(10_000);

        expect(passedThrough(await pending)).toBe(true);
    });

    it('cancels the index fetch once the wait runs out', async () => {
        vi.useFakeTimers();
        fetchIndex.mockImplementation(stalledFetch);
        const proxy = await freshProxy();

        const pending = proxy('https://docs.seedcord.org/packages/gateway/0.6.0');
        await vi.advanceTimersByTimeAsync(10_000);
        await pending;

        expect(fetchIndex.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    });

    it('fetches the index again on the next request after a load that timed out', async () => {
        vi.useFakeTimers();
        fetchIndex.mockImplementationOnce(stalledFetch);
        const proxy = await freshProxy();

        const first = proxy('https://docs.seedcord.org/packages/gateway/0.6.0');
        await vi.advanceTimersByTimeAsync(10_000);
        await first;

        expect((await proxy('https://docs.seedcord.org/packages/gateway/0.6.0')).status).toBe(308);
    });

    it('loads the index again on the next request after a failed load', async () => {
        fetchIndex.mockImplementationOnce(() => Promise.reject(new Error('cdn down')));
        const proxy = await freshProxy();

        await proxy('https://docs.seedcord.org/packages/gateway/0.6.0');
        const res = await proxy('https://docs.seedcord.org/packages/gateway/0.6.0');

        expect(res.status).toBe(308);
    });

    it('fetches the index once for back-to-back requests', async () => {
        const proxy = await freshProxy();

        await proxy('https://docs.seedcord.org/packages/gateway/0.6.0');
        await proxy('https://docs.seedcord.org/packages/gateway/0.7.0');

        expect(fetchIndex).toHaveBeenCalledTimes(1);
    });

    it('fetches the index once for requests that arrive while it loads', async () => {
        const proxy = await freshProxy();

        await Promise.all([
            proxy('https://docs.seedcord.org/packages/gateway/0.6.0'),
            proxy('https://docs.seedcord.org/packages/gateway/0.7.0')
        ]);

        expect(fetchIndex).toHaveBeenCalledTimes(1);
    });
});
