import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { stripVTControlCharacters } from 'node:util';

import { Logger } from '@seedcord/logger';

import { resolveProjectTsc } from '#core/modules/resolveProjectTsc';

import type { Readable } from 'node:stream';

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

        const tscPath = resolveProjectTsc(this.cwd ?? process.cwd());
        if (!tscPath) {
            this.logger.error('Unable to resolve "typescript". Install it in the project to enable tsc --watch.');
            return;
        }

        const args = [tscPath, '--noEmit', '--watch', '--preserveWatchOutput', '--pretty'];
        if (this.tsconfigPath) {
            args.push('--project', this.tsconfigPath);
        }

        this.logger.debug('Starting tsc --watch...');

        this.process = spawn(process.execPath, args, {
            cwd: this.cwd ?? process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.logLines(this.process.stdout, (line) => {
            const level = /^\[\d{1,2}:\d{2}:\d{2}/.test(stripVTControlCharacters(line)) ? 'debug' : 'error';
            this.logger[level](line);
        });
        this.logLines(this.process.stderr, (line) => this.logger.error(line));

        this.process.on('error', (err) => {
            this.logger.error(`Failed to start tsc: ${err.message}`);
        });

        this.process.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                this.logger.error(`tsc exited with code ${code}`);
            } else {
                this.logger.debug('tsc exited.');
            }
        });

        // a failed spawn emits close without exit
        this.process.on('close', () => {
            this.process = null;
        });
    }

    private logLines(stream: Readable | null, log: (line: string) => void): void {
        if (!stream) return;
        createInterface({ input: stream }).on('line', (line) => {
            if (line.trim()) log(line.trimEnd());
        });
    }

    // windows can't delete tsc's cwd until tsc exits
    public async stop(): Promise<void> {
        const child = this.process;
        if (!child) return;

        this.logger.debug('Stopping tsc...');
        // events.once rejects when the child emits error
        const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
        child.kill('SIGTERM');

        // justified: tsc --watch can ignore SIGTERM when stdin is detached (Windows/some Node builds), so escalate to SIGKILL after a grace window. unref so the timer never holds the event loop open.
        const killTimer = setTimeout(() => child.kill('SIGKILL'), TSC_GRACEFUL_EXIT_MS);
        killTimer.unref();
        await closed;
        clearTimeout(killTimer);
        // start() refuses a second tsc until its close listener clears the handle
    }
}
