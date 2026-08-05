import { EventEmitter } from 'node:events';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { CloudflaredTunnel } from '@commands/dev/tunnel/CloudflaredTunnel';

import type { TunnelDeps } from '@commands/dev/tunnel/CloudflaredTunnel';
import type { ChildProcess } from 'node:child_process';

const METRICS_PORT = 20_500;
const RUNNING = new AbortController().signal;
const BINARY = '/usr/local/bin/cloudflared';
const HEALTH_PATH = '/health';

function fakeChild(): ChildProcess & { killed: string[] } {
    const child = Object.assign(new EventEmitter(), {
        killed: [] as string[],
        kill(signal: string) {
            this.killed.push(signal);
            return true;
        }
    });
    // justified: the tunnel reads only the listener and kill surface of a child process
    return child as unknown as ChildProcess & { killed: string[] };
}

function deps(overrides: Partial<TunnelDeps> = {}): TunnelDeps {
    return {
        spawn: () => fakeChild(),
        fetch: () => Promise.resolve(Response.json({ hostname: 'abc.trycloudflare.com' })),
        freePort: () => Promise.resolve(METRICS_PORT),
        wait: () => Promise.resolve(),
        ...overrides
    };
}

describe('CloudflaredTunnel', () => {
    it('survives a spawn failure', async () => {
        const child = fakeChild();
        const tunnel = new CloudflaredTunnel(
            deps({
                spawn: () => {
                    // emitted on the next tick, the way node reports a failed exec
                    setTimeout(() => child.emit('error', new Error('EACCES')), 0);
                    return child;
                },
                fetch: () => Promise.reject(new Error('refused'))
            }),
            BINARY
        );

        const error: unknown = await tunnel.open(RUNNING, 3000, HEALTH_PATH).then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
    });

    it('reads the hostname off the metrics server and gives it a scheme', async () => {
        const tunnel = new CloudflaredTunnel(deps(), BINARY);

        await expect(tunnel.open(RUNNING, 3000, HEALTH_PATH)).resolves.toBe('https://abc.trycloudflare.com');
    });

    it('spawns the binary the PATH scan resolved', async () => {
        const spawn = vi.fn<TunnelDeps['spawn']>(() => fakeChild());
        const tunnel = new CloudflaredTunnel(deps({ spawn }), '/opt/homebrew/bin/cloudflared');

        await tunnel.open(RUNNING, 3000, HEALTH_PATH);

        expect(spawn.mock.calls[0]?.[0]).toBe('/opt/homebrew/bin/cloudflared');
    });

    it('points cloudflared at the bot port and pins its metrics port', async () => {
        const spawn = vi.fn<TunnelDeps['spawn']>(() => fakeChild());
        const tunnel = new CloudflaredTunnel(deps({ spawn }), BINARY);

        await tunnel.open(RUNNING, 4321, HEALTH_PATH);

        expect(spawn.mock.calls[0]?.[1]).toEqual([
            'tunnel',
            '--url',
            'http://localhost:4321',
            '--metrics',
            `127.0.0.1:${String(METRICS_PORT)}`
        ]);
    });

    it('polls until the metrics server reports a hostname', async () => {
        const pending = [''];
        const quick = vi.fn(() => Response.json({ hostname: pending.shift() ?? 'late.trycloudflare.com' }));
        const tunnel = new CloudflaredTunnel(
            deps({
                fetch: (url) => Promise.resolve(url.startsWith('https://') ? Response.json({ status: 'ok' }) : quick())
            }),
            BINARY
        );

        await expect(tunnel.open(RUNNING, 3000, HEALTH_PATH)).resolves.toBe('https://late.trycloudflare.com');
        expect(quick).toHaveBeenCalledTimes(2);
    });

    it('throws when the hostname never arrives', async () => {
        const tunnel = new CloudflaredTunnel(deps({ fetch: () => Promise.reject(new Error('refused')) }), BINARY);

        const error: unknown = await tunnel.open(RUNNING, 3000, HEALTH_PATH).then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
    });

    it('throws when the health path never answers', async () => {
        const fetch = vi.fn<TunnelDeps['fetch']>((url) =>
            url.startsWith('https://')
                ? Promise.reject(new Error('ENOTFOUND'))
                : Promise.resolve(Response.json({ hostname: 'abc.trycloudflare.com' }))
        );
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY);

        const error: unknown = await tunnel.open(RUNNING, 3000, HEALTH_PATH).then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUnreachable)).toBe(true);
    });

    it('probes the health path until it answers', async () => {
        let resolved = false;
        const health = vi.fn(() => {
            const answer = resolved
                ? Promise.resolve(Response.json({ status: 'ok' }))
                : Promise.reject(new Error('ENOTFOUND'));
            resolved = true;
            return answer;
        });
        const tunnel = new CloudflaredTunnel(
            deps({
                fetch: (url) =>
                    url.startsWith('https://')
                        ? health()
                        : Promise.resolve(Response.json({ hostname: 'abc.trycloudflare.com' }))
            }),
            BINARY
        );

        await tunnel.open(RUNNING, 3000, HEALTH_PATH);

        expect(health).toHaveBeenCalledTimes(2);
    });

    it('probes the health path the bot reported', async () => {
        const fetch = vi.fn<TunnelDeps['fetch']>((url) =>
            url.startsWith('https://')
                ? Promise.resolve(Response.json({ status: 'ok' }))
                : Promise.resolve(Response.json({ hostname: 'abc.trycloudflare.com' }))
        );
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY);

        await tunnel.open(RUNNING, 3000, '/alive');

        expect(fetch.mock.calls.at(-1)?.[0]).toBe('https://abc.trycloudflare.com/alive');
    });

    it('keeps probing while the edge answers without reaching the bot', async () => {
        const health = vi
            .fn<() => Promise<Response>>()
            .mockResolvedValueOnce(new Response(null, { status: 502 }))
            .mockResolvedValueOnce(Response.json({ status: 'ok' }));
        const tunnel = new CloudflaredTunnel(
            deps({
                fetch: (url) =>
                    url.startsWith('https://')
                        ? health()
                        : Promise.resolve(Response.json({ hostname: 'abc.trycloudflare.com' }))
            }),
            BINARY
        );

        await tunnel.open(RUNNING, 3000, HEALTH_PATH);

        expect(health).toHaveBeenCalledTimes(2);
    });

    it('skips the probe when the bot serves no health path', async () => {
        const fetch = vi.fn<TunnelDeps['fetch']>(() => Promise.resolve(Response.json({ hostname: 'abc.tld' })));
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY);

        await expect(tunnel.open(RUNNING, 3000)).resolves.toBe('https://abc.tld');
        expect(fetch).toHaveBeenCalledOnce();
    });

    // the raw attempt signal would let a hung request outlive the whole budget
    it('gives each probe request the timed budget signal', async () => {
        const fetch = vi.fn<TunnelDeps['fetch']>((url) =>
            Promise.resolve(
                url.startsWith('https://') ? Response.json({ status: 'ok' }) : Response.json({ hostname: 'abc.tld' })
            )
        );
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY);

        await tunnel.open(RUNNING, 3000, HEALTH_PATH);

        expect(fetch.mock.calls.at(-1)?.[1]?.signal).not.toBe(RUNNING);
    });

    it('gives up when cloudflared exits before reporting a hostname', async () => {
        const child = fakeChild();
        const fetch = vi.fn<TunnelDeps['fetch']>(() => {
            child.emit('exit', 1);
            return Promise.reject(new Error('refused'));
        });
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child, fetch }), BINARY);

        const error: unknown = await tunnel.open(RUNNING, 3000, HEALTH_PATH).then(
            () => null,
            (caught: unknown) => caught
        );

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('stops polling once the attempt is aborted', async () => {
        const attempt = new AbortController();
        const fetch = vi.fn<TunnelDeps['fetch']>(() => {
            attempt.abort();
            return Promise.reject(new Error('refused'));
        });
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY);

        await expect(tunnel.open(attempt.signal, 3000)).rejects.toThrow();
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('escalates to SIGKILL when SIGTERM leaves the child running', async () => {
        vi.useFakeTimers();
        const child = fakeChild();
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child }), BINARY);
        await tunnel.open(RUNNING, 3000, HEALTH_PATH);

        tunnel.stop();
        expect(child.killed).toEqual(['SIGTERM']);

        vi.advanceTimersByTime(5000);
        expect(child.killed).toEqual(['SIGTERM', 'SIGKILL']);
        vi.useRealTimers();
    });
});
