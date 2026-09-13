import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { Workspace } from '#src/lib/Workspace';

const snapshot = {
    rootDir: '/repo',
    rootPackage: {
        dir: '/repo',
        relativeDir: '.',
        packageJson: { name: '@seedcord/seedcord', version: '0.0.0', private: true }
    },
    packages: [
        {
            dir: '/repo/packages/core',
            relativeDir: 'packages/core',
            packageJson: { name: '@seedcord/core', version: '0.7.0' }
        },
        {
            dir: '/repo/scripts',
            relativeDir: 'scripts',
            packageJson: { name: '@seedcord/scripts', version: '0.0.1', private: true }
        }
    ]
};

describe('Workspace', () => {
    it('finds a package directory by name', () => {
        const workspace = new Workspace(snapshot);

        expect(workspace.directoryOf('@seedcord/core')).toBe('/repo/packages/core');
        expect(workspace.directoryOf('@seedcord/nope')).toBeUndefined();
    });

    it('lists every package.json path, the root one included', () => {
        expect(new Workspace(snapshot).packageJsonPaths()).toEqual([
            path.join('/repo', 'package.json'),
            path.join('/repo/packages/core', 'package.json'),
            path.join('/repo/scripts', 'package.json')
        ]);
    });

    it('omits the root path when the workspace has no root package', () => {
        const rootless = { rootDir: '/repo', packages: snapshot.packages };

        expect(new Workspace(rootless).packageJsonPaths()).toEqual([
            path.join('/repo/packages/core', 'package.json'),
            path.join('/repo/scripts', 'package.json')
        ]);
    });

    it('lists every package, private ones included', () => {
        expect(new Workspace(snapshot).all().map((one) => one.packageJson.name)).toEqual([
            '@seedcord/core',
            '@seedcord/scripts'
        ]);
    });

    it('keeps only the packages that publish', () => {
        expect(new Workspace(snapshot).published().map((one) => one.packageJson.name)).toEqual(['@seedcord/core']);
    });

    it('loads this repo from disk', async () => {
        const workspace = await Workspace.load(process.cwd());

        expect(workspace.directoryOf('@seedcord/scripts')).toBe(path.resolve(process.cwd()));
        expect(workspace.directoryOf('@seedcord/core')?.endsWith(path.join('packages', 'core'))).toBe(true);
    });
});
