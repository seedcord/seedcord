import { describe, expect, it } from 'vitest';

import { CdnPurge } from '#src/docs/CdnPurge';

interface Call {
    url: string;
    method: string;
    body: string | undefined;
    headers: Record<string, string>;
}

interface Reply {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}

type Fetcher = (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<Reply>;

function recorder(reply: Reply): { calls: Call[]; fetcher: Fetcher } {
    const calls: Call[] = [];

    const fetcher: Fetcher = (url, init) => {
        calls.push({ url, method: init?.method ?? 'GET', body: init?.body, headers: init?.headers ?? {} });
        return Promise.resolve(reply);
    };

    return { calls, fetcher };
}

const ok = (payload: unknown): Reply => ({
    ok: true,
    status: 200,
    json: (): Promise<unknown> => Promise.resolve(payload)
});

describe('CdnPurge.bodyFor', () => {
    it('purges everything when no target is given', () => {
        expect(CdnPurge.bodyFor({ prefixes: [], files: [] })).toEqual({ purge_everything: true });
    });

    it('purges the full URLs given as files', () => {
        expect(CdnPurge.bodyFor({ prefixes: [], files: ['https://cdn.seedcord.org/index.json'] })).toEqual({
            files: ['https://cdn.seedcord.org/index.json']
        });
    });

    it('purges by prefix', () => {
        expect(CdnPurge.bodyFor({ prefixes: ['docs.seedcord.org/packages/seedcord'], files: [] })).toEqual({
            prefixes: ['docs.seedcord.org/packages/seedcord']
        });
    });

    it('prefers prefixes when both are given', () => {
        const body = CdnPurge.bodyFor({
            prefixes: ['cdn.seedcord.org'],
            files: ['https://cdn.seedcord.org/index.json']
        });

        expect(body).toEqual({ prefixes: ['cdn.seedcord.org'] });
    });
});

describe('CdnPurge.purge', () => {
    it('posts the body to the zone', async () => {
        const { calls, fetcher } = recorder(ok({ success: true }));

        await new CdnPurge('zone-1', 'secret', fetcher).purge({ prefixes: ['docs.seedcord.org'] });

        expect(calls[0]?.url).toBe('https://api.cloudflare.com/client/v4/zones/zone-1/purge_cache');
        expect(calls[0]?.method).toBe('POST');
        expect(calls[0]?.headers.authorization).toBe('Bearer secret');
        expect(calls[0]?.body).toBe(JSON.stringify({ prefixes: ['docs.seedcord.org'] }));
    });

    it('throws when cloudflare reports a failure', async () => {
        const { fetcher } = recorder({
            ok: false,
            status: 403,
            json: (): Promise<unknown> => Promise.resolve({ success: false, errors: [{ code: 1012 }] })
        });

        await expect(new CdnPurge('zone-1', 'secret', fetcher).purge({ purge_everything: true })).rejects.toThrow(
            /403/
        );
    });

    it('throws when the reply is ok but success is false', async () => {
        const { fetcher } = recorder(ok({ success: false, errors: [] }));

        await expect(new CdnPurge('zone-1', 'secret', fetcher).purge({ purge_everything: true })).rejects.toThrow(
            /Cloudflare purge failed/
        );
    });
});
