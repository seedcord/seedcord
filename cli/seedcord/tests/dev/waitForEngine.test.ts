import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { waitForEngine } from '@commands/dev/tunnel/waitForEngine';

import type { ProbeDeps } from '@commands/dev/tunnel/waitForEngine';

const URL = 'https://abc.trycloudflare.com';

function deps(fetch: ProbeDeps['fetch']): ProbeDeps {
    return { fetch, wait: () => Promise.resolve() };
}

describe('waitForEngine', () => {
    it('resolves once the root answers 405', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 405 }));

        await expect(waitForEngine(URL, deps(fetch))).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledExactlyOnceWith(URL);
    });

    it('keeps polling while the edge reports the tunnel is down', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockResolvedValueOnce(new Response(null, { status: 502 }))
            .mockResolvedValueOnce(new Response(null, { status: 405 }));

        await expect(waitForEngine(URL, deps(fetch))).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('keeps polling past a connection failure', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockRejectedValueOnce(new Error('ECONNREFUSED'))
            .mockResolvedValueOnce(new Response(null, { status: 405 }));

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
