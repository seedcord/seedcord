import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { Workspace } from '#src/lib/Workspace';
import { resolvePackages } from '#src/release/release-packages';

async function workspaceWith(changelogs: Record<string, string>): Promise<Workspace> {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'release-packages-'));
    const packages = [];

    for (const [name, changelog] of Object.entries(changelogs)) {
        const dir = path.join(rootDir, 'packages', name.replace('@seedcord/', ''));
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'CHANGELOG.md'), changelog);
        packages.push({ dir, relativeDir: path.relative(rootDir, dir), packageJson: { name, version: '0.0.0' } });
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

    it('throws naming a package the workspace lacks', async () => {
        const workspace = await workspaceWith({});

        await expect(resolvePackages(workspace, [{ name: '@seedcord/nope', version: '1.0.0' }])).rejects.toThrow(
            /@seedcord\/nope/
        );
    });
});
