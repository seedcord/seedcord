import { execFile } from 'node:child_process';
import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vite-plus/test';

import { Workspace } from '#src/lib/Workspace';
import { readReleasePackages } from '#src/release/readReleasePackages';

const run = promisify(execFile);

async function repository(root: string): Promise<(...args: string[]) => Promise<void>> {
    const git = async (...args: string[]): Promise<void> => {
        await run('git', ['-c', 'user.name=Release Test', '-c', 'user.email=release@example.test', ...args], {
            cwd: root
        });
    };
    await git('init', '--quiet');
    return git;
}

async function manifest(root: string, name: string, version: string, isPrivate = false): Promise<void> {
    const dir = path.join(root, 'packages', name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name, version, private: isPrivate }));
}

async function workspace(rootDir: string): Promise<Workspace> {
    await writeFile(path.join(rootDir, 'package.json'), JSON.stringify({ name: 'root', private: true }));
    await writeFile(path.join(rootDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    return Workspace.load(rootDir);
}

describe('readReleasePackages', () => {
    it('keeps the full release list before and after the release tag is created', async () => {
        await using dir = await mkdtempDisposable(path.join(tmpdir(), 'release-plan-'));
        const git = await repository(dir.path);
        await manifest(dir.path, 'errors', '0.1.0');
        await manifest(dir.path, 'utils', '0.1.0');
        await manifest(dir.path, 'internal', '0.1.0', true);
        await git('add', '.');
        await git('commit', '--quiet', '--no-gpg-sign', '-m', 'previous release');
        await git('tag', 'release-2026.11.23');

        await manifest(dir.path, 'errors', '0.1.1');
        await manifest(dir.path, 'linked-roles', '0.1.0');
        await manifest(dir.path, 'internal', '0.1.1', true);
        await git('add', '.');
        await git('commit', '--quiet', '--no-gpg-sign', '-m', 'version packages');
        const current = await workspace(dir.path);
        const expected = [
            { name: 'errors', version: '0.1.1' },
            { name: 'linked-roles', version: '0.1.0' }
        ];

        expect(await readReleasePackages(current)).toEqual(expected);
        await git('tag', 'release-2026.11.24');
        expect(await readReleasePackages(current)).toEqual(expected);

        await git('commit', '--quiet', '--no-gpg-sign', '--allow-empty', '-m', 're-enter pre mode');
        expect(await readReleasePackages(current)).toEqual([]);
        expect(await readReleasePackages(current, 'release-2026.11.23')).toEqual(expected);
    });

    it('includes all public packages before the first release', async () => {
        await using dir = await mkdtempDisposable(path.join(tmpdir(), 'release-plan-'));
        const git = await repository(dir.path);
        await manifest(dir.path, 'core', '0.1.0-next.0');
        await manifest(dir.path, 'internal', '0.1.0', true);
        await git('add', '.');
        await git('commit', '--quiet', '--no-gpg-sign', '-m', 'first release');

        expect(await readReleasePackages(await workspace(dir.path))).toEqual([
            { name: 'core', version: '0.1.0-next.0' }
        ]);
    });

    it('includes a package that becomes public without changing its version', async () => {
        await using dir = await mkdtempDisposable(path.join(tmpdir(), 'release-plan-'));
        const git = await repository(dir.path);
        await manifest(dir.path, 'plugin', '0.1.0', true);
        await git('add', '.');
        await git('commit', '--quiet', '--no-gpg-sign', '-m', 'previous release');
        await git('tag', 'release-2026.11.23');
        await manifest(dir.path, 'plugin', '0.1.0');
        await git('add', '.');
        await git('commit', '--quiet', '--no-gpg-sign', '-m', 'publish plugin');

        expect(await readReleasePackages(await workspace(dir.path))).toEqual([{ name: 'plugin', version: '0.1.0' }]);
    });

    it('rejects an invalid historical manifest instead of silently treating its version as changed', async () => {
        await using dir = await mkdtempDisposable(path.join(tmpdir(), 'release-plan-'));
        const git = await repository(dir.path);
        await manifest(dir.path, 'plugin', '0.1.0');
        await writeFile(path.join(dir.path, 'packages/plugin/package.json'), '{"name":"plugin","version":1}');
        await git('add', '.');
        await git('commit', '--quiet', '--no-gpg-sign', '-m', 'invalid version');
        await git('tag', 'release-2026.11.23');
        await manifest(dir.path, 'plugin', '0.1.0');
        await git('add', '.');
        await git('commit', '--quiet', '--no-gpg-sign', '-m', 'fix manifest');

        await expect(readReleasePackages(await workspace(dir.path))).rejects.toThrow(
            'release-2026.11.23:packages/plugin/package.json must contain a string name and version'
        );
    });
});
