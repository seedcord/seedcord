import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { Workspace } from '#src/lib/Workspace';
import { resolvePackages } from '#src/release/release-packages';

async function workspaceWith(
    changelogs: Record<string, string>,
    manifests: Record<string, Record<string, string>> = {}
): Promise<Workspace> {
    const tmp = await mkdtempDisposable(path.join(tmpdir(), 'release-packages-'));
    onTestFinished(() => tmp.remove());
    const rootDir = tmp.path;
    const packages = [];

    for (const [name, changelog] of Object.entries(changelogs)) {
        const dir = path.join(rootDir, 'packages', name.replace('@seedcord/', ''));
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'CHANGELOG.md'), changelog);
        const packageJson = { name, version: '0.0.0', ...manifests[name] };
        packages.push({ dir, relativeDir: path.relative(rootDir, dir), packageJson });
    }

    return new Workspace({ rootDir, packages });
}

describe('resolvePackages', () => {
    it('reads the old version and the directory from the workspace', async () => {
        const workspace = await workspaceWith({ '@seedcord/core': '# @seedcord/core\n\n## 0.7.0\n\n## 0.6.0\n' });

        const [core] = await resolvePackages(workspace, [{ name: '@seedcord/core', version: '0.7.0' }]);

        expect(core).toMatchObject({
            name: '@seedcord/core',
            version: '0.7.0',
            oldVersion: '0.6.0',
            directory: 'packages/core'
        });
    });

    it('leaves the old version off a first publish', async () => {
        const workspace = await workspaceWith({ '@seedcord/kit': '# @seedcord/kit\n\n## 0.1.0\n' });

        const [kit] = await resolvePackages(workspace, [{ name: '@seedcord/kit', version: '0.1.0' }]);

        expect(kit).not.toHaveProperty('oldVersion');
    });

    it('marks a package that ships a command and nothing to import', async () => {
        const workspace = await workspaceWith(
            { 'create-seedcord': '# create-seedcord\n\n## 0.4.0\n', seedcord: '# seedcord\n\n## 0.21.3\n' },
            {
                'create-seedcord': { bin: 'dist/index.js' },
                seedcord: { bin: 'dist/cli.js', exports: './dist/index.js' }
            }
        );

        const resolved = await resolvePackages(workspace, [
            { name: 'create-seedcord', version: '0.4.0' },
            { name: 'seedcord', version: '0.21.3' }
        ]);

        expect(resolved.map((pkg) => pkg.commandOnly)).toEqual([true, undefined]);
    });

    it('throws naming a package the workspace lacks', async () => {
        const workspace = await workspaceWith({});

        await expect(resolvePackages(workspace, [{ name: '@seedcord/nope', version: '1.0.0' }])).rejects.toThrow(
            /@seedcord\/nope/
        );
    });
});
