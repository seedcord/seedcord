import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { readPublished, readStatusReleases } from '#src/lib/published-packages';
import { Workspace } from '#src/lib/Workspace';

const CORE = '[{"name":"@seedcord/core","version":"0.7.0"}]';

describe('readPublished', () => {
    it('reads the inline json', async () => {
        await expect(readPublished({ published: CORE })).resolves.toEqual([
            { name: '@seedcord/core', version: '0.7.0' }
        ]);
    });

    it('reads the json from a file, which wins over the inline flag', async () => {
        await using dir = await mkdtempDisposable(path.join(tmpdir(), 'published-'));
        const file = path.join(dir.path, 'published.json');
        await writeFile(file, CORE);

        await expect(readPublished({ published: '[]', 'published-file': file })).resolves.toEqual([
            { name: '@seedcord/core', version: '0.7.0' }
        ]);
    });

    it('throws naming both flags when neither is passed', async () => {
        await expect(readPublished({})).rejects.toThrow(/--published-file/);
    });

    it('rejects json that is not an array', async () => {
        await expect(readPublished({ published: '{}' })).rejects.toThrow(/JSON array/);
    });

    it('rejects a null entry', async () => {
        await expect(readPublished({ published: '[null]' })).rejects.toThrow(/name and version/);
    });

    it('rejects an entry without a string version', async () => {
        await expect(readPublished({ published: '[{"name":"@seedcord/core","version":7}]' })).rejects.toThrow(
            /name and version/
        );
    });
});

describe('readStatusReleases', () => {
    const workspaceAt = (rootDir: string): Workspace =>
        new Workspace({
            rootDir,
            packages: [
                { dir: rootDir, relativeDir: '.', packageJson: { name: '@seedcord/core', version: '0.0.0' } },
                { dir: rootDir, relativeDir: '.', packageJson: { name: 'guide', version: '0.0.0', private: true } }
            ]
        });

    it('reads the new version of every public release', async () => {
        await using dir = await mkdtempDisposable(path.join(tmpdir(), 'status-'));
        await mkdir(path.join(dir.path, '.changeset'));
        const releases = [
            { name: '@seedcord/core', newVersion: '0.8.0' },
            { name: 'guide', newVersion: '0.3.0' }
        ];
        await writeFile(path.join(dir.path, '.changeset', 'status.json'), JSON.stringify({ releases }));

        await expect(readStatusReleases(workspaceAt(dir.path))).resolves.toEqual([
            { name: '@seedcord/core', version: '0.8.0' }
        ]);
    });

    it('tells you to run cs:status when the status file is missing', async () => {
        await using dir = await mkdtempDisposable(path.join(tmpdir(), 'status-'));

        await expect(readStatusReleases(workspaceAt(dir.path))).rejects.toThrow(/pnpm cs:status/);
    });
});
