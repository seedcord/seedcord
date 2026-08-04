import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { Logger } from '@seedcord/logger';

const TSC_GRACEFUL_EXIT_MS = 2000;

export class TscRunner {
    private process: ChildProcess | null = null;
    private readonly logger: Logger;

    constructor(
        private readonly tsconfigPath?: string,
        private readonly cwd?: string
    ) {
        this.logger = new Logger('Typecheck', { channel: 'tsc' });
    }

    public start(): void {
        if (this.process) return;

        const tscPath = this.resolveProjectTsc();
        if (!tscPath) {
            this.logger.error('Unable to resolve "typescript". Install it in the project to enable tsc --watch.');
            return;
        }

        const args = [tscPath, '--noEmit', '--watch', '--preserveWatchOutput', '--pretty'];
        if (this.tsconfigPath) {
            args.push('--project', this.tsconfigPath);
        }

        this.logger.info('Starting tsc --watch...');

        this.process = spawn(process.execPath, args, {
            cwd: this.cwd ?? process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.process.stdout?.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    this.logger.info(line.trimEnd());
                }
            }
        });

        this.process.stderr?.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    this.logger.error(line.trimEnd());
                }
            }
        });

        this.process.on('error', (err) => {
            this.logger.error(`Failed to start tsc: ${err.message}`);
        });

        this.process.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                this.logger.error(`tsc exited with code ${code}`);
            } else {
                this.logger.info('tsc exited.');
            }
            this.process = null;
        });
    }

    public stop(): void {
        const child = this.process;
        if (!child) return;

        this.logger.info('Stopping tsc...');
        child.kill('SIGTERM');

        // justified: tsc --watch can ignore SIGTERM when stdin is detached (Windows/some Node builds); escalate to SIGKILL after a grace window. unref so the timer never holds the event loop open.
        const killTimer = setTimeout(() => child.kill('SIGKILL'), TSC_GRACEFUL_EXIT_MS);
        killTimer.unref();
        child.once('exit', () => {
            clearTimeout(killTimer);
        });
        // The handle is nulled by the 'exit' listener in start(); leaving it set until exit prevents start() from spawning a second tsc over a still-dying one.
    }

    private resolveProjectTsc(): string | null {
        const projectDir = this.cwd ?? process.cwd();
        const manifest = resolve(projectDir, 'package.json');
        const projectRequire = existsSync(manifest) ? createRequire(manifest) : createRequire(import.meta.url);

        try {
            return projectRequire.resolve('typescript/bin/tsc');
        } catch {
            return null;
        }
    }
}
