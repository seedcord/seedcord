import { chmod, mkdir, mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { ProjectFiles } from '#core/project/ProjectFiles';

async function projectRoot(): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-files-'));
    onTestFinished(() => tmp.remove());
    return tmp.path;
}

describe('ProjectFiles', () => {
    // the bot and its plugins run between the load checks and the bundle
    it('lists a folder created after the # check ran', async () => {
        const root = await projectRoot();
        const files = new ProjectFiles(root, join(root, 'dist'), root);

        await files.pathsWithHash();
        await mkdir(join(root, 'made-on-load'));

        await expect(files.foldersIncludingEmpty()).resolves.toContain('/made-on-load');
    });

    // root reads a folder whatever its mode
    it.skipIf(process.getuid?.() === 0)('throws CoreDirectoryUnreadable for a folder it cannot read', async () => {
        const root = await projectRoot();
        const locked = join(root, 'locked');
        await mkdir(locked);
        await chmod(locked, 0o000);
        onTestFinished(() => chmod(locked, 0o700));

        await expect(new ProjectFiles(root, join(root, 'dist'), root).pathsWithHash()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryUnreadable,
            message: expect.stringContaining('locked') as string
        });
    });
});
