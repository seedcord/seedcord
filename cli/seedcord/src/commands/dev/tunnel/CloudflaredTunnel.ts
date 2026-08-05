import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { ChildProcess } from 'node:child_process';

const POLL_INTERVAL_MS = 250;
// the create step alone measured around 10s against trycloudflare
const POLL_ATTEMPTS = 240;
const GRACEFUL_EXIT_MS = 2000;

export interface TunnelDeps {
    spawn: (command: string, args: string[]) => ChildProcess;
    fetch: (url: string, init?: RequestInit) => Promise<Response>;
    freePort: () => Promise<number>;
    wait: (ms: number) => Promise<void>;
}

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            // justified: address() is AddressInfo once a TCP server is listening
            const { port } = probe.address() as { port: number };
            probe.close(() => resolve(port));
        });
    });
}

export function systemTunnelDeps(): TunnelDeps {
    return {
        spawn: (command, args) => spawn(command, args, { stdio: 'ignore' }),
        fetch: (url, init) => fetch(url, init),
        freePort,
        wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    };
}

export class CloudflaredTunnel {
    private child: ChildProcess | undefined;
    private failure: Error | undefined;

    constructor(
        private readonly deps: TunnelDeps,
        private readonly binary: string
    ) {}

    public async open(targetPort: number, signal: AbortSignal): Promise<string> {
        const metricsPort = await this.deps.freePort();

        const child = this.deps.spawn(this.binary, [
            'tunnel',
            '--url',
            `http://localhost:${String(targetPort)}`,
            '--metrics',
            `127.0.0.1:${String(metricsPort)}`
        ]);
        // a spawn failure emits here, and node throws it process-wide with no listener attached
        child.on('error', (error) => {
            this.failure = error;
        });
        // stop() clears this.child before killing, so a deliberate kill skips this
        child.on('exit', (code) => {
            if (this.child !== child) return;
            this.failure = new Error(`cloudflared exited early with code ${String(code)}`);
        });
        this.child = child;

        return `https://${await this.readHostname(metricsPort, signal)}`;
    }

    public stop(): void {
        const child = this.child;
        if (!child) return;

        this.child = undefined;
        this.failure = undefined;
        child.kill('SIGTERM');

        const escalate = setTimeout(() => child.kill('SIGKILL'), GRACEFUL_EXIT_MS);
        escalate.unref();
        child.once('exit', () => {
            clearTimeout(escalate);
        });
    }

    private async readHostname(metricsPort: number, signal: AbortSignal): Promise<string> {
        for (let attempt = 0; attempt < POLL_ATTEMPTS && !this.failure; attempt++) {
            signal.throwIfAborted();
            const hostname = await this.pollOnce(metricsPort, signal);
            if (hostname) return hostname;
            await this.deps.wait(POLL_INTERVAL_MS);
        }

        const cause = this.failure;
        this.stop();
        throw new SeedcordError(
            SeedcordErrorCode.CliTunnelUrlUnavailable,
            [(POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000],
            { cause }
        );
    }

    private async pollOnce(metricsPort: number, signal: AbortSignal): Promise<string | undefined> {
        try {
            const response = await this.deps.fetch(`http://127.0.0.1:${String(metricsPort)}/quicktunnel`, { signal });
            // justified: the cloudflared metrics route returns this shape
            const { hostname } = (await response.json()) as { hostname?: string };
            return hostname === '' ? undefined : hostname; // empty until the edge assigns one
        } catch {
            return undefined;
        }
    }
}
