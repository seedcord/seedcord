import { spawn } from 'node:child_process';

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { resolveProjectTsc } from './resolveProjectTsc';

interface TscResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export async function runProjectTsc(projectDir: string, args: string[]): Promise<TscResult> {
    const tsc = resolveProjectTsc(projectDir);
    if (!tsc) {
        throw new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [
            ['typescript'],
            projectDir,
            `seedcord reads your tsconfig with it, and ${paint.bold('seedcord build')} type checks with it.`
        ]);
    }

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

        child.on('error', (error) => {
            rejectPromise(
                new SeedcordError(SeedcordErrorCode.CliTypescriptNotStarted, [tsc, error.message], { cause: error })
            );
        });
        child.on('close', (code) => {
            resolvePromise({ exitCode: code ?? 1, stdout, stderr });
        });
    });
}
