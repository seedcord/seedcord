import { describe, expect, it, vi } from 'vitest';

import { awaitReachable } from '#commands/dev/tunnel/probe';

import type { ProbeDeps } from '#commands/dev/tunnel/probe';

const URL_UNDER_TEST = 'https://bot.example.com';
const RUNNING = new AbortController().signal;

function deps(fetch: ProbeDeps['fetch']): ProbeDeps {
    return { fetch, wait: () => Promise.resolve() };
}

describe('awaitReachable', () => {
    it('returns once an unsigned post is refused', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 401 }));

        await expect(awaitReachable(URL_UNDER_TEST, deps(fetch), RUNNING)).resolves.toBe(true);
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('posts to the url with no signature headers', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 401 }));

        await awaitReachable(URL_UNDER_TEST, deps(fetch), RUNNING);

        expect(fetch.mock.calls[0]?.[0]).toBe(URL_UNDER_TEST);
        expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST');
    });

    it('keeps polling while the name has not resolved', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockRejectedValueOnce(new Error('ENOTFOUND'))
            .mockResolvedValueOnce(new Response(null, { status: 401 }));

        await awaitReachable(URL_UNDER_TEST, deps(fetch), RUNNING);

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('keeps polling while the edge answers without reaching the bot', async () => {
        const fetch = vi
            .fn<ProbeDeps['fetch']>()
            .mockResolvedValueOnce(new Response(null, { status: 502 }))
            .mockResolvedValueOnce(new Response(null, { status: 401 }));

        await awaitReachable(URL_UNDER_TEST, deps(fetch), RUNNING);

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('reports false when nothing answers as this bot', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 502 }));

        await expect(awaitReachable(URL_UNDER_TEST, deps(fetch), RUNNING)).resolves.toBe(false);
    });

    it('stops polling once the attempt is aborted', async () => {
        const attempt = new AbortController();
        const fetch = vi.fn<ProbeDeps['fetch']>(() => {
            attempt.abort();
            return Promise.reject(new Error('ECONNREFUSED'));
        });

        await expect(awaitReachable(URL_UNDER_TEST, deps(fetch), attempt.signal)).rejects.toThrow();
        expect(fetch).toHaveBeenCalledOnce();
    });

    // the raw attempt signal would let a hung request outlive the whole budget
    it('gives each request the timed budget signal', async () => {
        const fetch = vi.fn<ProbeDeps['fetch']>().mockResolvedValue(new Response(null, { status: 401 }));

        await awaitReachable(URL_UNDER_TEST, deps(fetch), RUNNING);

        expect(fetch.mock.calls[0]?.[1]?.signal).not.toBe(RUNNING);
    });
});
