import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { execRunner, spawnSpec } from '#scaffold/exec';

function noise(prefix: string, count: number): string {
    return `for (let i = 0; i < ${count}; i++) console.log('${prefix} ' + i);`;
}

function indented(count: number): string {
    return `for (let i = 0; i < ${count}; i++) console.log('    frame ' + i);`;
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

    it('keeps an executable path whole on windows', () => {
        const spec = spawnSpec(String.raw`C:\Program Files\nodejs\node.exe`, ['-e', ''], 'win32');

        expect(spec.shell).toBe(false);
        expect(spec.command).toBe(String.raw`C:\Program Files\nodejs\node.exe`);
    });
});

async function warningOf(...statements: string[]): Promise<string | null> {
    return execRunner(process.execPath, ['-e', `${statements.join(' ')} process.exit(1);`], process.cwd());
}

describe('execRunner', () => {
    it('resolves with no warning when the command exits zero', async () => {
        await expect(execRunner(process.execPath, ['-e', ''], process.cwd())).resolves.toBeNull();
    });

    // pnpm installs every package, then exits non-zero to report the scripts it skipped
    it('treats a blocked build script as success and hands back the reason', async () => {
        const warning = await warningOf(
            `console.error('Error: ERR_PNPM_IGNORED_BUILDS');`,
            `console.error('  ╰─▶ Ignored build scripts: esbuild@0.28.2');`,
            `console.error('  help: Run "pnpm approve-builds" to pick which dependencies should be allowed');`
        );

        expect(warning).toContain('Ignored build scripts: esbuild@0.28.2');
        expect(warning).toContain('pnpm approve-builds');
    });

    it('keeps the line that carries the cause, above the boilerplate npm ends on', async () => {
        const captured = await capturedBy(
            noise('resolving', 40),
            `console.log('npm error code ECONNREFUSED');`,
            noise('A complete log', 40)
        );

        expect(captured).toContain('ECONNREFUSED');
        expect(captured).not.toContain('A complete log');
    });

    // pnpm writes "Error: " and its code on separate lines once its output is piped
    it('keeps the indented detail under a bare error header', async () => {
        const captured = await capturedBy(
            noise('Progress: resolved', 20),
            `console.error('Error: ');`,
            `console.error('ERR_PNPM_FETCH_404');`,
            `console.error('  × adding a new package');`,
            `console.error('  ╰─▶ GET https://registry.npmjs.org/nope: Not Found');`
        );

        expect(captured).toContain('ERR_PNPM_FETCH_404');
        expect(captured).toContain('Not Found');
        expect(captured).not.toContain('Progress: resolved');
    });

    it('reports an indented line once when it names an error the header already covered', async () => {
        const captured = await capturedBy(
            `console.error('Error: the build died');`,
            `console.error('    at ERR_boom (/x.js:1:1)');`,
            `console.error('    second frame');`
        );

        expect(captured.split('second frame')).toHaveLength(2);
    });

    it('keeps the cause when an earlier line mentions an error and drags detail along', async () => {
        const captured = await capturedBy(
            `console.log('npm warn deprecated request: see error log for details');`,
            indented(30),
            `console.log('npm error code E404');`
        );

        expect(captured).toContain('E404');
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
