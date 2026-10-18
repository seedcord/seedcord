import { realpathSync } from 'node:fs';
import { mkdir, mkdtempDisposable, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { assertProjectInstall } from '#core/project/assertProjectInstall';

const GLOBAL_CLI = join(tmpdir(), 'global', 'seedcord', 'dist');

async function writePackage(dir: string): Promise<string> {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'package.json'), '{}');
    return dir;
}

async function tempProject(): Promise<string> {
    const dir = await mkdtempDisposable(join(tmpdir(), 'seedcord-install-'));
    onTestFinished(() => dir.remove());
    return writePackage(dir.path);
}

describe('assertProjectInstall', () => {
    it('throws when the project has no seedcord installed', async () => {
        const project = await tempProject();

        expect(() => assertProjectInstall(project, GLOBAL_CLI)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliDependencyMissing })
        );
    });

    it('throws when the running CLI is a different install from the project', async () => {
        const project = await tempProject();
        await writePackage(join(project, 'node_modules', 'seedcord'));

        expect(() => assertProjectInstall(project, GLOBAL_CLI)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliNotProjectInstall })
        );
    });

    it('passes when the CLI runs from the real folder behind a symlinked install', async () => {
        const project = await tempProject();
        const store = await writePackage(join(project, 'node_modules', '.pnpm', 'seedcord@1.0.0', 'seedcord'));
        await symlink(store, join(project, 'node_modules', 'seedcord'), 'dir');

        expect(() => assertProjectInstall(project, join(realpathSync(store), 'dist'))).not.toThrow();
    });
});
