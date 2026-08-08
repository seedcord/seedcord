import { spawn } from 'node:child_process';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { CommandRunner } from '@scaffold/scaffold';

// an install logs hundreds of lines before the one that names the failure
const KEPT_LINES = 12;

// pnpm redraws its progress with carriage returns
const LINE_BREAK = /[\r\n]+/;
// one uncut chunk grew past node's max string length
const MAX_LINE = 120;

export async function execRunner(...[command, args, cwd, onLine]: Parameters<CommandRunner>): Promise<void> {
    const spoken = [command, ...args].join(' ');

    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd });
        const captured: string[] = [];

        const take = (chunk: Buffer): void => {
            for (const line of chunk.toString('utf8').split(LINE_BREAK)) {
                const text = line.trim().slice(0, MAX_LINE);
                if (text === '') continue;

                captured.push(text);

                try {
                    onLine?.(text);
                } catch {
                    // a throw inside a stream handler escapes this promise as an uncaught exception
                }
            }
        };

        child.stdout.on('data', take);
        child.stderr.on('data', take);

        child.on('error', (error) => {
            reject(new SeedcordError(SeedcordErrorCode.CreateStepFailed, [spoken, error.message]));
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            const tail = captured.slice(-KEPT_LINES).join('\n');
            reject(new SeedcordError(SeedcordErrorCode.CreateStepFailed, [spoken, tail || `exited with ${code}`]));
        });
    });
}
