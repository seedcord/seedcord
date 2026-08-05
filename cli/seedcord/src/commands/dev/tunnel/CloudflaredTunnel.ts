import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { ChildProcess } from 'node:child_process';

const POLL_INTERVAL_MS = 250;
const HOSTNAME_ATTEMPTS = 240;
const SETTLE_MS = 4000;
const HEALTH_BUDGET_MS = 10_000;
const HEALTH_ATTEMPTS = HEALTH_BUDGET_MS / POLL_INTERVAL_MS;
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

    public async open(signal: AbortSignal, targetPort: number, healthPath?: string): Promise<string> {
        const metricsPort = await this.deps.freePort();

        const child = this.deps.spawn(this.binary, [
            'tunnel',
            '--url',
            `http://localhost:${String(targetPort)}`,
            '--metrics',
            `127.0.0.1:${String(metricsPort)}`
        ]);
        // without a listener node throws a spawn failure process-wide
        child.on('error', (error) => {
            this.failure = error;
        });
        // stop() clears this.child first, so a deliberate kill skips this
        child.on('exit', (code) => {
            if (this.child !== child) return;
            this.failure = new Error(`cloudflared exited early with code ${String(code)}`);
        });
        this.child = child;

        const url = `https://${await this.readHostname(metricsPort, signal)}`;
        // the record lands ~2.5s later and an early lookup caches NXDOMAIN for a 30 minute negative TTL
        await this.deps.wait(SETTLE_MS);
        if (healthPath !== undefined) await this.awaitHealth(`${url}${healthPath}`, signal);
        return url;
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
        for (let attempt = 0; attempt < HOSTNAME_ATTEMPTS && !this.failure; attempt++) {
            signal.throwIfAborted();
            const hostname = await this.pollOnce(metricsPort, signal);
            if (hostname) return hostname;
            await this.deps.wait(POLL_INTERVAL_MS);
        }

        const cause = this.failure;
        this.stop();
        throw new SeedcordError(
            SeedcordErrorCode.CliTunnelUrlUnavailable,
            [(HOSTNAME_ATTEMPTS * POLL_INTERVAL_MS) / 1000],
            { cause }
        );
    }

    // one budget shared by every request, so a slow answer still gets the time left in it
    private async awaitHealth(probe: string, signal: AbortSignal): Promise<void> {
        const budget = AbortSignal.any([signal, AbortSignal.timeout(HEALTH_BUDGET_MS)]);

        for (let attempt = 0; attempt < HEALTH_ATTEMPTS && !this.failure; attempt++) {
            try {
                const response = await this.deps.fetch(probe, { signal: budget });
                if (response.ok) return;
            } catch {
                signal.throwIfAborted();
            }
            await this.deps.wait(POLL_INTERVAL_MS);
        }

        throw new SeedcordError(SeedcordErrorCode.CliTunnelUnreachable, [probe, HEALTH_BUDGET_MS / 1000], {
            cause: this.failure
        });
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
