import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { execRunner, spawnSpec } from '@scaffold/exec';

function noise(prefix: string, count: number): string {
    return `for (let i = 0; i < ${count}; i++) console.log('${prefix} ' + i);`;
}

async function failureOf(...statements: string[]): Promise<string> {
    try {
        await execRunner(process.execPath, ['-e', `${statements.join(' ')} process.exit(1);`], process.cwd());
    } catch (error) {
        return Error.isError(error) ? error.message : String(error);
    }

    throw new Error('the script was supposed to exit non-zero');
}

// the first line repeats the whole script back
async function capturedBy(...statements: string[]): Promise<string> {
    const message = await failureOf(...statements);

    return message.split('\n').slice(1).join('\n');
}

describe('spawnSpec', () => {
    it('keeps a commit message whole on windows', () => {
        const spec = spawnSpec('git', ['commit', '-m', 'chore: create seedcord bot'], 'win32');

        expect(spec.shell).toBe(false);
        expect(spec.args).toEqual(['commit', '-m', 'chore: create seedcord bot']);
    });

    it('passes a package manager one string and no args on windows', () => {
        const spec = spawnSpec('npm', ['i', '-D', 'prettier'], 'win32');

        expect(spec.shell).toBe(true);
        expect(spec.command).toBe('npm i -D prettier');
        expect(spec.args).toEqual([]);
    });

    it('uses no shell anywhere else', () => {
        expect(spawnSpec('npm', ['i'], 'darwin').shell).toBe(false);
    });
});

describe('execRunner', () => {
    it('resolves when the command exits zero', async () => {
        await expect(execRunner(process.execPath, ['-e', ''], process.cwd())).resolves.toBeUndefined();
    });

    it('keeps the line naming the cause, which sits above the boilerplate npm ends on', async () => {
        const captured = await capturedBy(
            noise('resolving', 40),
            `console.log('npm error code ECONNREFUSED');`,
            noise('A complete log', 40)
        );

        expect(captured).toContain('ECONNREFUSED');
        expect(captured).not.toContain('A complete log');
    });

    it('falls back to the tail when no line names itself an error', async () => {
        expect(await capturedBy(noise('plain output', 40))).toContain('plain output 39');
    });

    it('names the command that failed', async () => {
        expect(await failureOf('')).toContain(process.execPath);
    });

    it('reports the exit code when the command printed nothing', async () => {
        expect(await failureOf('')).toContain('exited with 1');
    });
});
