import { describe, expect, it } from 'vite-plus/test';

import { CatalogRule } from '#src/catalog/CatalogRule';
import { DependencyIndex, distinctPackages } from '#src/catalog/DependencyIndex';

import type { DepRef } from '#src/catalog/DependencyIndex';

const ref = (packageJsonPath: string, field: DepRef['field'], version = 'catalog:peer'): DepRef => ({
    packageJsonPath,
    packageName: undefined,
    field,
    version
});

const manifest = (path: string, json: object): { path: string; json: object } => ({ path, json });

const names = (violations: readonly { depName: string }[]): string[] => violations.map((one) => one.depName).sort();

describe('distinctPackages', () => {
    it('counts one package that lists the dep in two fields once', () => {
        const refs = [
            ref('plugins/kysely-postgres/package.json', 'devDependencies'),
            ref('plugins/kysely-postgres/package.json', 'peerDependencies')
        ];

        expect(distinctPackages(refs)).toBe(1);
    });

    it('counts each package that lists the dep', () => {
        const refs = [
            ref('plugins/kysely-postgres/package.json', 'devDependencies'),
            ref('apps/guide/package.json', 'devDependencies')
        ];

        expect(distinctPackages(refs)).toBe(2);
    });

    it('returns zero when nothing references the dep', () => {
        expect(distinctPackages([])).toBe(0);
    });
});

describe('DependencyIndex', () => {
    const index = new DependencyIndex([
        manifest('packages/core/package.json', {
            dependencies: { 'discord-api-types': 'catalog:deps' },
            devDependencies: { vitest: 'catalog:test' }
        }),
        manifest('apps/guide/package.json', { devDependencies: { vitest: 'catalog:test', next: '^16.3.4' } })
    ]);

    it('collects a dep across packages and fields', () => {
        expect(index.refsFor('vitest')).toHaveLength(2);
        expect(index.refsFor('discord-api-types')).toEqual([
            { packageJsonPath: 'packages/core/package.json', field: 'dependencies', version: 'catalog:deps' }
        ]);
    });

    it('returns nothing for a dep no package lists', () => {
        expect(index.refsFor('left-pad')).toEqual([]);
    });

    it('names every dep it saw', () => {
        expect(index.names().sort()).toEqual(['discord-api-types', 'next', 'vitest']);
    });
});

describe('CatalogRule', () => {
    const noEntries = new CatalogRule(new Set());

    it('flags a literal version that two packages share', () => {
        const index = new DependencyIndex([
            manifest('packages/core/package.json', { devDependencies: { chalk: '^6.0.0' } }),
            manifest('apps/guide/package.json', { devDependencies: { chalk: '^6.0.0' } })
        ]);

        expect(noEntries.violations(index)).toEqual([
            expect.objectContaining({ depName: 'chalk', reason: 'duplicate-literal' })
        ]);
    });

    it('flags a catalog reference that the catalogs block never declares', () => {
        const index = new DependencyIndex([
            manifest('packages/core/package.json', { devDependencies: { shiki: 'catalog:deps' } }),
            manifest('apps/guide/package.json', { devDependencies: { shiki: 'catalog:deps' } })
        ]);

        expect(noEntries.violations(index)).toEqual([
            expect.objectContaining({ depName: 'shiki', reason: 'catalog-missing-entry' })
        ]);
    });

    it('flags a catalog entry that fewer than two packages use', () => {
        const index = new DependencyIndex([
            manifest('packages/core/package.json', { devDependencies: { vitest: 'catalog:test' } })
        ]);

        expect(new CatalogRule(new Set(['vitest'])).violations(index)).toEqual([
            expect.objectContaining({ depName: 'vitest', reason: 'catalog-underused' })
        ]);
    });

    it('leaves a dep that only one package lists alone', () => {
        const index = new DependencyIndex([
            manifest('packages/core/package.json', { devDependencies: { chalk: '^6.0.0' } })
        ]);

        expect(noEntries.violations(index)).toEqual([]);
    });

    it('counts one package listing a dep in two fields as one user', () => {
        const index = new DependencyIndex([
            manifest('plugins/mongoose/package.json', {
                peerDependencies: { mongoose: '^9.9.1' },
                devDependencies: { mongoose: '^9.9.1' }
            })
        ]);

        expect(noEntries.violations(index)).toEqual([]);
    });

    it('allows the literal react peer range of discord-component-embed', () => {
        const index = new DependencyIndex([
            manifest('apps/guide/package.json', { dependencies: { react: 'catalog:react' } }),
            manifest('tooling/ui/package.json', { peerDependencies: { react: 'catalog:react' } }),
            manifest('packages/discord-component-embed/package.json', {
                name: 'discord-component-embed',
                peerDependencies: { react: '^17.0.0 || ^18.0.0 || ^19.0.0' },
                devDependencies: { react: 'catalog:react' }
            })
        ]);

        expect(new CatalogRule(new Set(['react'])).violations(index)).toEqual([]);
    });

    it.each([
        ['react in another package', 'react', 'packages/other', '^17.0.0 || ^18.0.0 || ^19.0.0'],
        ['discord.js in a plugin', 'discord.js', 'plugins/mongoose', '^14.27.0']
    ])('flags a literal peer range for %s', (_label, depName, dir, range) => {
        const index = new DependencyIndex([
            manifest('apps/guide/package.json', { dependencies: { [depName]: 'catalog:peer' } }),
            manifest(`${dir}/package.json`, { name: dir, peerDependencies: { [depName]: range } })
        ]);

        expect(new CatalogRule(new Set([depName])).violations(index)).toEqual([
            expect.objectContaining({ depName, reason: 'duplicate-literal' })
        ]);
    });

    it('skips eslint, which the Next apps pin a major behind', () => {
        const index = new DependencyIndex([
            manifest('packages/core/package.json', { devDependencies: { eslint: '^10.8.0' } }),
            manifest('apps/guide/package.json', { devDependencies: { eslint: '^9.0.0' } })
        ]);

        expect(noEntries.violations(index)).toEqual([]);
    });
});

describe('CatalogRule.fromYaml', () => {
    it('reads every bucket of the catalogs block as one set of names', () => {
        const workspaceYaml = [
            'packages:',
            '  - packages/*',
            '',
            'catalogs:',
            '  deps:',
            '    chalk: ^6.0.0',
            "    '@types/node': ^26.1.2",
            '  peer:',
            '    typescript: ^6.0.3',
            ''
        ].join('\n');

        const index = new DependencyIndex([
            manifest('packages/core/package.json', { devDependencies: { chalk: 'catalog:deps' } })
        ]);

        expect(names(CatalogRule.fromYaml(workspaceYaml).violations(index))).toEqual([
            '@types/node',
            'chalk',
            'typescript'
        ]);
    });
});
