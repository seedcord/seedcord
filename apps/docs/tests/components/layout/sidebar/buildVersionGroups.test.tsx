import { describe, expect, it } from 'vitest';

import { buildVersionGroups } from '@components/layout/sidebar/utils/buildVersionGroups';

import type { PackageVersionCatalog } from '@lib/docs/types';

function makeVersion(id: string, overrides: Partial<PackageVersionCatalog> = {}): PackageVersionCatalog {
    return {
        id,
        label: `v${id}`,
        basePath: `/packages/seedcord/${id}`,
        isLatest: false,
        channel: 'stable',
        categories: [],
        ...overrides
    };
}

describe('buildVersionGroups', () => {
    it('splits stable and prerelease into separate groups, prerelease labelled', () => {
        const groups = buildVersionGroups([
            makeVersion('0.10.6', { isLatest: true }),
            makeVersion('0.9.4'),
            makeVersion('0.11.0-next.1', { channel: 'prerelease' })
        ]);

        expect(groups.map((group) => group.id)).toEqual(['stable', 'prerelease']);
        expect(groups[0]?.options.map((option) => option.value)).toEqual(['0.10.6', '0.9.4']);
        expect(groups[1]?.label).toBe('pre-release');
        expect(groups[1]?.options.map((option) => option.value)).toEqual(['0.11.0-next.1']);
    });

    it('attaches a trailing badge only to the latest stable', () => {
        const [stable] = buildVersionGroups([makeVersion('0.10.6', { isLatest: true }), makeVersion('0.9.4')]);
        const [latest, older] = stable?.options ?? [];

        expect(latest?.trailing).toBeTruthy();
        expect(older?.trailing).toBeUndefined();
    });

    it('omits the prerelease group when there are no prereleases', () => {
        const groups = buildVersionGroups([makeVersion('0.10.6', { isLatest: true })]);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.id).toBe('stable');
    });
});
