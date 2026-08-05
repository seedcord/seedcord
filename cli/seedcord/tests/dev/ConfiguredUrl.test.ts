import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { ConfiguredUrl } from '@commands/dev/tunnel/ConfiguredUrl';

import type { ProbeDeps } from '@commands/dev/tunnel/ConfiguredUrl';

const CONFIGURED = 'https://bot.example.com';
const RUNNING = new AbortController().signal;

function deps(fetch: ProbeDeps['fetch']): ProbeDeps {
    return { fetch, wait: () => Promise.resolve() };
}

describe('ConfiguredUrl', () => {
    it('returns the url once an unsigned post is refused', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 401 }));

        await expect(new ConfiguredUrl(CONFIGURED, deps(fetch)).open(3000, RUNNING)).resolves.toBe(CONFIGURED);
        expect(fetch).toHaveBeenCalledExactlyOnceWith(CONFIGURED, { method: 'POST', signal: RUNNING });
    });

    it('keeps probing while the forwarder is still coming up', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockRejectedValueOnce(new Error('ECONNREFUSED'))
            .mockResolvedValueOnce(new Response(null, { status: 401 }));

        await expect(new ConfiguredUrl(CONFIGURED, deps(fetch)).open(3000, RUNNING)).resolves.toBe(CONFIGURED);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws when nothing answers as this bot', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 502 }));

        const error: unknown = await new ConfiguredUrl(CONFIGURED, deps(fetch)).open(3000, RUNNING).then(
            () => null,
            (caught: unknown) => caught
        );

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUnreachable)).toBe(true);
    });

    it('stops probing once the attempt is aborted', async () => {
        const attempt = new AbortController();
        const fetch = vi.fn<ProbeDeps['fetch']>(() => {
            attempt.abort();
            return Promise.reject(new Error('ECONNREFUSED'));
        });

        await expect(new ConfiguredUrl(CONFIGURED, deps(fetch)).open(3000, attempt.signal)).rejects.toThrow();
        expect(fetch).toHaveBeenCalledOnce();
    });
});
