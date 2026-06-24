import { describe, expect, it } from 'vitest';

import { buildIndex } from '@remote/index-builder';
import { validateIndex } from '@remote/index-json';

const UPDATED_AT = '2026-06-02T00:00:00.000Z';

describe('buildIndex', () => {
    it('builds stable line heads + prerelease latest for a pre-1.0 package', () => {
        const index = buildIndex(
            [{ folder: 'seedcord', fullName: 'seedcord', versions: ['0.8.7', '0.9.4', '0.10.6', '0.11.0-next.1'] }],
            { updatedAt: UPDATED_AT }
        );

        expect(index.schemaVersion).toBe(1);
        expect(index.updatedAt).toBe(UPDATED_AT);
        expect(index.pathTemplates.stable).toContain('{name}');
        expect(index.pathTemplates.stable).toContain('{version}');

        const entry = index.packages.seedcord;
        expect(entry?.fullName).toBe('seedcord');
        expect(entry?.stable?.latest).toBe('0.10.6');
        expect(entry?.stable?.latestByMinor).toEqual({ '0.8': '0.8.7', '0.9': '0.9.4', '0.10': '0.10.6' });
        expect(entry?.stable?.latestByMajor).toEqual({ '0': '0.10.6' });
        expect(entry?.prerelease).toEqual({ latest: '0.11.0-next.1' });
    });

    it('builds per-major heads for a post-1.0 package', () => {
        const index = buildIndex([{ folder: 'x', fullName: '@s/x', versions: ['1.2.0', '1.3.2', '2.0.0', '2.0.1'] }], {
            updatedAt: UPDATED_AT
        });

        expect(index.packages.x?.stable?.latest).toBe('2.0.1');
        expect(index.packages.x?.stable?.latestByMajor).toEqual({ '1': '1.3.2', '2': '2.0.1' });
    });

    it('marks a package with only prereleases as stable:null', () => {
        const index = buildIndex([{ folder: 'x', fullName: '@s/x', versions: ['1.0.0-next.1'] }], {
            updatedAt: UPDATED_AT
        });

        expect(index.packages.x?.stable).toBeNull();
        expect(index.packages.x?.prerelease).toEqual({ latest: '1.0.0-next.1' });
    });

    it('drops invalid version strings', () => {
        const index = buildIndex([{ folder: 'x', fullName: '@s/x', versions: ['1.0.0', 'not-a-version', ''] }], {
            updatedAt: UPDATED_AT
        });

        expect(index.packages.x?.stable?.latest).toBe('1.0.0');
        expect(index.packages.x?.prerelease).toBeNull();
    });

    it('carries the entity slug -> tone map onto the entry', () => {
        const index = buildIndex(
            [{ folder: 'x', fullName: '@s/x', versions: ['1.0.0'], entities: { logger: 'class', core: 'interface' } }],
            { updatedAt: UPDATED_AT }
        );

        expect(index.packages.x?.entities).toEqual({ logger: 'class', core: 'interface' });
    });

    it('omits an empty entity map', () => {
        const index = buildIndex([{ folder: 'x', fullName: '@s/x', versions: ['1.0.0'], entities: {} }], {
            updatedAt: UPDATED_AT
        });

        expect(index.packages.x?.entities).toBeUndefined();
    });

    it('carries the package description onto the entry', () => {
        const index = buildIndex(
            [{ folder: 'x', fullName: '@s/x', versions: ['1.0.0'], description: 'Utility helpers for seedcord.' }],
            { updatedAt: UPDATED_AT }
        );

        expect(index.packages.x?.description).toBe('Utility helpers for seedcord.');
    });

    it('omits the description when none is supplied', () => {
        const index = buildIndex([{ folder: 'x', fullName: '@s/x', versions: ['1.0.0'] }], { updatedAt: UPDATED_AT });

        expect(index.packages.x).not.toHaveProperty('description');
    });

    it('preserves the description through a validateIndex round-trip', () => {
        const built = buildIndex(
            [{ folder: 'x', fullName: '@s/x', versions: ['1.0.0'], description: 'Survives serialize + re-read.' }],
            { updatedAt: UPDATED_AT }
        );

        const reparsed = validateIndex(JSON.parse(JSON.stringify(built)));
        expect(reparsed.packages.x?.description).toBe('Survives serialize + re-read.');
    });
});
