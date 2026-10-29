import { chmod, mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { claimTarget } from '#scaffold/target';
import { thrownBy } from '#tests/thrownBy';

async function scratch(): Promise<string> {
    const dir = await mkdtempDisposable(join(tmpdir(), 'create-seedcord-'));
    onTestFinished(() => dir.remove());
    return dir.path;
}

describe('claimTarget', () => {
    it('accepts a path that does not exist yet', async () => {
        const target = join(await scratch(), 'my-bot');

        expect(claimTarget(target)).toEqual({ existed: false });
    });

    it('reports an existing empty directory, which the cleanup leaves behind', async () => {
        const target = join(await scratch(), 'my-bot');
        await mkdir(target);

        expect(claimTarget(target)).toEqual({ existed: true });
    });

    it('refuses a directory with anything in it', async () => {
        const target = join(await scratch(), 'my-bot');
        await mkdir(target);
        await writeFile(join(target, 'README.md'), 'mine');

        const thrown = thrownBy(() => claimTarget(target));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateTargetNotEmpty)).toBe(true);
        expect((thrown as Error).message).toContain('my-bot');
    });

    it('counts a dotfile as content', async () => {
        const target = join(await scratch(), 'my-bot');
        await mkdir(target);
        await writeFile(join(target, '.env'), 'SECRET=1');

        const thrown = thrownBy(() => claimTarget(target));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateTargetNotEmpty)).toBe(true);
    });

    it('refuses a path that is a file', async () => {
        const target = join(await scratch(), 'my-bot');
        await writeFile(target, 'not a directory');

        const thrown = thrownBy(() => claimTarget(target));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateTargetNotEmpty)).toBe(true);
    });

    it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
        "throws CreateInvalidAnswer with the path when it can't read the folder",
        async () => {
            const target = join(await scratch(), 'my-bot');
            await mkdir(target, { mode: 0o000 });
            onTestFinished(() => chmod(target, 0o700));

            const thrown = thrownBy(() => claimTarget(target));

            expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateInvalidAnswer)).toBe(true);
            expect((thrown as Error).message).toContain(target);
        }
    );
});
