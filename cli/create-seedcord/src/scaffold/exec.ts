import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { CommandRunner } from '@scaffold/scaffold';

const run = promisify(execFile);

function reasonFrom(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'stderr' in error) {
        const { stderr } = error;
        if (typeof stderr === 'string' && stderr.trim() !== '') return stderr.trim();
    }

    return Error.isError(error) ? error.message : String(error);
}

export async function execRunner(...[command, args, cwd]: Parameters<CommandRunner>): Promise<void> {
    try {
        await run(command, args, { cwd });
    } catch (error) {
        throw new SeedcordError(SeedcordErrorCode.CreateStepFailed, [[command, ...args].join(' '), reasonFrom(error)]);
    }
}
