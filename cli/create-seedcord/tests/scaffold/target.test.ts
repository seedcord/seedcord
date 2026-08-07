import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { claimTarget } from '@src/scaffold/target';

async function scratch(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'create-seedcord-'));
}

async function thrownBy(run: () => Promise<unknown>): Promise<unknown> {
    try {
        await run();
    } catch (error) {
        return error;
    }

    return undefined;
}

describe('claimTarget', () => {
    it('accepts a path that does not exist yet', async () => {
        const target = join(await scratch(), 'my-bot');

        await expect(claimTarget(target)).resolves.toBeUndefined();
    });

    it('accepts an existing empty directory', async () => {
        const target = join(await scratch(), 'my-bot');
        await mkdir(target);

        await expect(claimTarget(target)).resolves.toBeUndefined();
    });

    it('refuses a directory with anything in it', async () => {
        const target = join(await scratch(), 'my-bot');
        await mkdir(target);
        await writeFile(join(target, 'README.md'), 'mine');

        const thrown = await thrownBy(() => claimTarget(target));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateTargetNotEmpty)).toBe(true);
        expect((thrown as Error).message).toContain('my-bot');
    });

    it('counts a dotfile as content', async () => {
        const target = join(await scratch(), 'my-bot');
        await mkdir(target);
        await writeFile(join(target, '.env'), 'SECRET=1');

        const thrown = await thrownBy(() => claimTarget(target));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateTargetNotEmpty)).toBe(true);
    });

    it('refuses a path that is a file', async () => {
        const target = join(await scratch(), 'my-bot');
        await writeFile(target, 'not a directory');

        const thrown = await thrownBy(() => claimTarget(target));

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateTargetNotEmpty)).toBe(true);
    });
});
