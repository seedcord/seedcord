import { spawn, type ChildProcess } from 'child_process';

import { Logger } from '@seedcord/services';

export class TscRunner {
    private process: ChildProcess | null = null;
    private readonly logger: Logger;

    constructor(
        private readonly tsconfigPath?: string,
        private readonly cwd?: string
    ) {
        this.logger = new Logger('tsc', { channel: 'tsc' });
    }

    public start(): void {
        if (this.process) return;

        const args = ['--noEmit', '--watch', '--preserveWatchOutput', '--pretty'];
        if (this.tsconfigPath) {
            args.push('--project', this.tsconfigPath);
        }

        this.logger.info('Starting tsc --watch...');

        this.process = spawn(`tsc ${args.join(' ')}`, {
            cwd: this.cwd ?? process.cwd(),
            shell: true,
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
        if (this.process) {
            this.logger.info('Stopping tsc...');
            this.process.kill();
            this.process = null;
        }
    }
}
