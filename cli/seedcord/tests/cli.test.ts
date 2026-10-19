import { execFile } from 'node:child_process';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { tempProject } from './core/config/projectLoaderFixtures';

const run = promisify(execFile);
const PACKAGE_DIR = join(import.meta.dirname, '..');
const BIN = join(PACKAGE_DIR, 'bin', 'seedcord.mjs');

async function codegenIn(projectDir: string): Promise<{ code: number; stderr: string }> {
    return run(process.execPath, [BIN, 'codegen'], { cwd: projectDir }).then(
        (ok) => ({ code: 0, stderr: ok.stderr }),
        (failed: { code: number; stderr: string }) => ({ code: failed.code, stderr: failed.stderr })
    );
}

describe('the seedcord CLI', () => {
    it('refuses to run in a project with no seedcord installed', async () => {
        const { code, stderr } = await codegenIn(tempProject());

        expect(code).toBe(1);
        expect(stderr).toContain(`[${SeedcordErrorCode.CliDependencyMissing}]`);
    });

    it('refuses to run from an install other than the project', async () => {
        const project = tempProject();
        const installed = join(project, 'node_modules', 'seedcord');
        await mkdir(installed, { recursive: true });
        await writeFile(join(installed, 'package.json'), '{}');

        const { code, stderr } = await codegenIn(project);

        expect(code).toBe(1);
        expect(stderr).toContain(`[${SeedcordErrorCode.CliNotProjectInstall}]`);
    });

    it('runs from a symlinked project install and goes on to look for the config', async () => {
        const project = tempProject();
        await mkdir(join(project, 'node_modules'));
        await symlink(PACKAGE_DIR, join(project, 'node_modules', 'seedcord'), 'dir');

        const { stderr } = await codegenIn(project);

        expect(stderr).toContain(`[${SeedcordErrorCode.CliConfigNotFound}]`);
    });
});
