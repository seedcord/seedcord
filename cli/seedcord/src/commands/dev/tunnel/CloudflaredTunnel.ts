import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { ChildProcess } from 'node:child_process';

const POLL_INTERVAL_MS = 250;
const POLL_ATTEMPTS = 60;
const GRACEFUL_EXIT_MS = 2000;

export interface TunnelDeps {
    spawn: (command: string, args: string[]) => ChildProcess;
    fetch: (url: string) => Promise<Response>;
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
        fetch: (url) => fetch(url),
        freePort,
        wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    };
}

export class CloudflaredTunnel {
    private child: ChildProcess | undefined;
    private hostname: string | undefined;

    constructor(private readonly deps: TunnelDeps) {}

    public get url(): string | undefined {
        return this.hostname === undefined ? undefined : `https://${this.hostname}`;
    }

    public async open(targetPort: number): Promise<string> {
        const metricsPort = await this.deps.freePort();

        this.child = this.deps.spawn('cloudflared', [
            'tunnel',
            '--url',
            `http://localhost:${String(targetPort)}`,
            '--metrics',
            `127.0.0.1:${String(metricsPort)}`
        ]);

        const hostname = await this.readHostname(metricsPort);
        this.hostname = hostname;
        return `https://${hostname}`;
    }

    public stop(): void {
        const child = this.child;
        if (!child) return;

        this.child = undefined;
        this.hostname = undefined;
        child.kill('SIGTERM');

        const escalate = setTimeout(() => child.kill('SIGKILL'), GRACEFUL_EXIT_MS);
        escalate.unref();
        child.once('exit', () => {
            clearTimeout(escalate);
        });
    }

    private async readHostname(metricsPort: number): Promise<string> {
        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
            const hostname = await this.pollOnce(metricsPort);
            if (hostname) return hostname;
            await this.deps.wait(POLL_INTERVAL_MS);
        }

        this.stop();
        throw new SeedcordError(SeedcordErrorCode.CliTunnelUrlUnavailable, [(POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000]);
    }

    private async pollOnce(metricsPort: number): Promise<string | undefined> {
        try {
            const response = await this.deps.fetch(`http://127.0.0.1:${String(metricsPort)}/quicktunnel`);
            // justified: the cloudflared metrics route returns this shape
            const { hostname } = (await response.json()) as { hostname?: string };
            return hostname === '' ? undefined : hostname; // empty until the edge assigns one
        } catch {
            return undefined;
        }
    }
}
