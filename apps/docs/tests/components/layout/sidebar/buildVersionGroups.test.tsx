import { describe, expect, it } from 'vitest';

import { buildVersionGroups } from '@components/layout/sidebar/utils/buildVersionGroups';

import type { PackageVersionCatalog } from '@lib/docs/types';

function makeVersion(id: string, overrides: Partial<PackageVersionCatalog> = {}): PackageVersionCatalog {
    return {
        id,
        label: `v${id}`,
        basePath: `/packages/seedcord/${id}`,
        isLatest: false,
        badge: null,
        channel: 'stable',
        categories: [],
        ...overrides
    };
}

describe('buildVersionGroups', () => {
    it('splits stable and prerelease into separate groups, prerelease labelled', () => {
        const groups = buildVersionGroups([
            makeVersion('0.10.6', { isLatest: true, badge: 'latest' }),
            makeVersion('0.9.4'),
            makeVersion('0.11.0-next.1', { channel: 'prerelease', badge: 'next' })
        ]);

        expect(groups.map((group) => group.id)).toEqual(['stable', 'prerelease']);
        expect(groups[0]?.options.map((option) => option.value)).toEqual(['0.10.6', '0.9.4']);
        expect(groups[1]?.label).toBe('pre-release');
        expect(groups[1]?.options.map((option) => option.value)).toEqual(['0.11.0-next.1']);
    });

    it('badges the latest stable and the prerelease head, but not older stable line heads', () => {
        const [stable, prerelease] = buildVersionGroups([
            makeVersion('0.10.6', { isLatest: true, badge: 'latest' }),
            makeVersion('0.9.4'),
            makeVersion('0.11.0-next.1', { channel: 'prerelease', badge: 'next' })
        ]);
        const [latest, older] = stable?.options ?? [];

        expect(latest?.trailing).toBeTruthy();
        expect(older?.trailing).toBeUndefined();
        expect(prerelease?.options[0]?.trailing).toBeTruthy();
    });

    it('renders a muted, non-selectable placeholder in the stable group on a 0-stable package', () => {
        const groups = buildVersionGroups([
            makeVersion('0.11.0-next.0', { channel: 'prerelease', isLatest: true, badge: 'next' })
        ]);

        expect(groups.map((group) => group.id)).toEqual(['stable', 'prerelease']);
        const placeholder = groups[0]?.options[0];
        expect(placeholder?.disabled).toBe(true);
        expect(placeholder?.label).toMatch(/no stable/i);
    });

    it('shows only the stable group when there are no prereleases', () => {
        const groups = buildVersionGroups([makeVersion('0.10.6', { isLatest: true, badge: 'latest' })]);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.id).toBe('stable');
        expect(groups[0]?.options.map((option) => option.value)).toEqual(['0.10.6']);
    });
});
