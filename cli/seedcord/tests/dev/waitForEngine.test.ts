import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { waitForEngine } from '@commands/dev/tunnel/waitForEngine';

import type { ProbeDeps } from '@commands/dev/tunnel/waitForEngine';

const URL = 'https://abc.trycloudflare.com';

function deps(fetch: ProbeDeps['fetch']): ProbeDeps {
    return { fetch, wait: () => Promise.resolve() };
}

describe('waitForEngine', () => {
    it('resolves once an unsigned post is refused', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 401 }));

        await expect(waitForEngine(URL, deps(fetch))).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledExactlyOnceWith(URL, { method: 'POST' });
    });

    it('keeps polling while the edge reports the tunnel is down', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockResolvedValueOnce(new Response(null, { status: 502 }))
            .mockResolvedValueOnce(new Response(null, { status: 401 }));

        await expect(waitForEngine(URL, deps(fetch))).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('keeps polling past a connection failure', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockRejectedValueOnce(new Error('ECONNREFUSED'))
            .mockResolvedValueOnce(new Response(null, { status: 401 }));

        await expect(waitForEngine(URL, deps(fetch))).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('keeps polling when a health endpoint answers the root', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockResolvedValueOnce(new Response(null, { status: 200 }))
            .mockResolvedValueOnce(new Response(null, { status: 401 }));

        await expect(waitForEngine(URL, deps(fetch))).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws when the engine never answers', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 530 }));

        const error: unknown = await waitForEngine(URL, deps(fetch)).then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelNotRouting)).toBe(true);
    });
});
