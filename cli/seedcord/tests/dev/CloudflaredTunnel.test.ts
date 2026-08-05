import { EventEmitter } from 'node:events';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { CloudflaredTunnel } from '@commands/dev/tunnel/CloudflaredTunnel';

import type { TunnelDeps } from '@commands/dev/tunnel/CloudflaredTunnel';
import type { ChildProcess } from 'node:child_process';

const METRICS_PORT = 20_500;
const RUNNING = new AbortController().signal;

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
            })
        );

        const error: unknown = await tunnel.open(3000, RUNNING).then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
    });

    it('reads the hostname off the metrics server and gives it a scheme', async () => {
        const tunnel = new CloudflaredTunnel(deps());

        await expect(tunnel.open(3000, RUNNING)).resolves.toBe('https://abc.trycloudflare.com');
    });

    it('points cloudflared at the bot port and pins its metrics port', async () => {
        const spawn = vi.fn<TunnelDeps['spawn']>(() => fakeChild());
        const tunnel = new CloudflaredTunnel(deps({ spawn }));

        await tunnel.open(4321, RUNNING);

        expect(spawn.mock.calls[0]?.[1]).toEqual([
            'tunnel',
            '--url',
            'http://localhost:4321',
            '--metrics',
            `127.0.0.1:${String(METRICS_PORT)}`
        ]);
    });

    it('polls until the metrics server reports a hostname', async () => {
        const fetch = vi
            .fn<TunnelDeps['fetch']>()
            .mockResolvedValueOnce(Response.json({ hostname: '' }))
            .mockResolvedValueOnce(Response.json({ hostname: 'late.trycloudflare.com' }));
        const tunnel = new CloudflaredTunnel(deps({ fetch }));

        await expect(tunnel.open(3000, RUNNING)).resolves.toBe('https://late.trycloudflare.com');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws when the hostname never arrives', async () => {
        const tunnel = new CloudflaredTunnel(deps({ fetch: () => Promise.reject(new Error('refused')) }));

        const error: unknown = await tunnel.open(3000, RUNNING).then(
            () => null,
            (caught: unknown) => caught
        );
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
    });

    it('gives up when cloudflared exits before reporting a hostname', async () => {
        const child = fakeChild();
        const fetch = vi.fn<TunnelDeps['fetch']>(() => {
            child.emit('exit', 1);
            return Promise.reject(new Error('refused'));
        });
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child, fetch }));

        const error: unknown = await tunnel.open(3000, RUNNING).then(
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
        const tunnel = new CloudflaredTunnel(deps({ fetch }));

        await expect(tunnel.open(3000, attempt.signal)).rejects.toThrow();
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('escalates to SIGKILL when SIGTERM leaves the child running', async () => {
        vi.useFakeTimers();
        const child = fakeChild();
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child }));
        await tunnel.open(3000, RUNNING);

        tunnel.stop();
        expect(child.killed).toEqual(['SIGTERM']);

        vi.advanceTimersByTime(5000);
        expect(child.killed).toEqual(['SIGTERM', 'SIGKILL']);
        vi.useRealTimers();
    });
});
