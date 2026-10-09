import { spawn } from 'node:child_process';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { resolveProjectTsc } from './resolveProjectTsc';

interface TscResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export async function runProjectTsc(projectDir: string, args: string[]): Promise<TscResult> {
    const tsc = resolveProjectTsc(projectDir);
    if (!tsc) throw new SeedcordError(SeedcordErrorCode.CliTypescriptMissing, [projectDir]);

    return await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(process.execPath, [tsc, ...args], { cwd: projectDir, stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
            stdout += String(chunk);
        });
        child.stderr.on('data', (chunk) => {
            stderr += String(chunk);
        });

        child.on('error', rejectPromise);
        child.on('close', (code) => {
            resolvePromise({ exitCode: code ?? 1, stdout, stderr });
        });
    });
}
