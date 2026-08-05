import { EventEmitter } from 'node:events';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { CloudflaredTunnel } from '@commands/dev/tunnel/CloudflaredTunnel';

import type { TunnelDeps } from '@commands/dev/tunnel/CloudflaredTunnel';
import type { ChildProcess } from 'node:child_process';

const METRICS_PORT = 20_500;
const RUNNING = new AbortController().signal;
const BINARY = '/usr/local/bin/cloudflared';
const LOST = (): void => undefined;

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

// the metrics server hands over a hostname, and the public url answers the probe as a seedcord bot
function answering(hostname = 'abc.trycloudflare.com'): TunnelDeps['fetch'] {
    return (url) =>
        Promise.resolve(url.startsWith('https://') ? new Response(null, { status: 401 }) : Response.json({ hostname }));
}

function deps(overrides: Partial<TunnelDeps> = {}): TunnelDeps {
    return {
        spawn: () => fakeChild(),
        fetch: answering(),
        freePort: () => Promise.resolve(METRICS_PORT),
        wait: () => Promise.resolve(),
        ...overrides
    };
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
        () => null,
        (error: unknown) => error
    );
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
            BINARY,
            LOST
        );

        const error = await caught(tunnel.open(RUNNING, 3000));

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
    });

    it('reads the hostname off the metrics server and gives it a scheme', async () => {
        const tunnel = new CloudflaredTunnel(deps(), BINARY, LOST);

        await expect(tunnel.open(RUNNING, 3000)).resolves.toBe('https://abc.trycloudflare.com');
    });

    it('spawns the binary the PATH scan resolved', async () => {
        const spawn = vi.fn<TunnelDeps['spawn']>(() => fakeChild());
        const tunnel = new CloudflaredTunnel(deps({ spawn }), '/opt/homebrew/bin/cloudflared', LOST);

        await tunnel.open(RUNNING, 3000);

        expect(spawn.mock.calls[0]?.[0]).toBe('/opt/homebrew/bin/cloudflared');
    });

    it('points cloudflared at the bot port and pins its metrics port', async () => {
        const spawn = vi.fn<TunnelDeps['spawn']>(() => fakeChild());
        const tunnel = new CloudflaredTunnel(deps({ spawn }), BINARY, LOST);

        await tunnel.open(RUNNING, 4321);

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
                fetch: (url) =>
                    Promise.resolve(url.startsWith('https://') ? new Response(null, { status: 401 }) : quick())
            }),
            BINARY,
            LOST
        );

        await expect(tunnel.open(RUNNING, 3000)).resolves.toBe('https://late.trycloudflare.com');
        expect(quick).toHaveBeenCalledTimes(2);
    });

    it('throws when the hostname never arrives', async () => {
        const tunnel = new CloudflaredTunnel(deps({ fetch: () => Promise.reject(new Error('refused')) }), BINARY, LOST);

        const error = await caught(tunnel.open(RUNNING, 3000));

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
    });

    // our resolver is not the one discord uses, so a silent probe still gets the url written
    it('reports the url when the hostname never answers as this bot', async () => {
        const fetch = vi.fn<TunnelDeps['fetch']>((url) =>
            url.startsWith('https://')
                ? Promise.reject(new Error('ENOTFOUND'))
                : Promise.resolve(Response.json({ hostname: 'abc.trycloudflare.com' }))
        );
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY, LOST);

        await expect(tunnel.open(RUNNING, 3000)).resolves.toBe('https://abc.trycloudflare.com');
    });

    it('gives up when cloudflared exits before reporting a hostname', async () => {
        const child = fakeChild();
        const fetch = vi.fn<TunnelDeps['fetch']>(() => {
            child.emit('exit', 1);
            return Promise.reject(new Error('refused'));
        });
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child, fetch }), BINARY, LOST);

        const error = await caught(tunnel.open(RUNNING, 3000));

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelUrlUnavailable)).toBe(true);
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('stops polling once the attempt is aborted', async () => {
        const attempt = new AbortController();
        const fetch = vi.fn<TunnelDeps['fetch']>(() => {
            attempt.abort();
            return Promise.reject(new Error('refused'));
        });
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY, LOST);

        await expect(tunnel.open(attempt.signal, 3000)).rejects.toThrow();
        expect(fetch).toHaveBeenCalledOnce();
    });

    // the raw attempt signal would allow a hung metrics request to persist beyond the poll window
    it('gives each metrics request the timed budget signal', async () => {
        const fetch = vi.fn<TunnelDeps['fetch']>(answering());
        const tunnel = new CloudflaredTunnel(deps({ fetch }), BINARY, LOST);

        await tunnel.open(RUNNING, 3000);

        expect(fetch.mock.calls[0]?.[1]?.signal).not.toBe(RUNNING);
    });

    it('reports a loss when the child exits after the url went out', async () => {
        const child = fakeChild();
        const lost = vi.fn();
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child }), BINARY, lost);
        await tunnel.open(RUNNING, 3000);

        child.emit('exit', 1);

        expect(lost).toHaveBeenCalledOnce();
    });

    it('stays quiet when stop kills the child', async () => {
        const child = fakeChild();
        const lost = vi.fn();
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child }), BINARY, lost);
        await tunnel.open(RUNNING, 3000);

        tunnel.stop();
        child.emit('exit', 0);

        expect(lost).not.toHaveBeenCalled();
    });

    it('escalates to SIGKILL when SIGTERM leaves the child running', async () => {
        vi.useFakeTimers();
        const child = fakeChild();
        const tunnel = new CloudflaredTunnel(deps({ spawn: () => child }), BINARY, LOST);
        await tunnel.open(RUNNING, 3000);

        tunnel.stop();
        expect(child.killed).toEqual(['SIGTERM']);

        vi.advanceTimersByTime(5000);
        expect(child.killed).toEqual(['SIGTERM', 'SIGKILL']);
        vi.useRealTimers();
    });
});
