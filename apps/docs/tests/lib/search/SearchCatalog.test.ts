import { describe, expect, it } from 'vitest';

import { SearchCatalog } from '#lib/search/SearchCatalog';

import type { SearchPackage } from '#lib/search/types';

const seedcord: SearchPackage = {
    id: 'seedcord',
    label: 'seedcord',
    fullName: 'seedcord',
    stable: '1.0.0',
    prerelease: null
};
const logger: SearchPackage = {
    id: 'logger',
    label: 'logger',
    fullName: '@seedcord/logger',
    stable: '2.1.0',
    prerelease: '3.0.0-next.1'
};

const onSeedcord = { pkg: 'seedcord', version: '1.0.0' };

describe('SearchCatalog.targets', () => {
    it('searches the viewed package at its url version so older versions stay searchable', () => {
        const catalog = new SearchCatalog([seedcord, logger]);
        expect(catalog.targets({ pkg: 'seedcord', version: '0.5.0' }, 'all', false)).toContainEqual({
            id: 'seedcord',
            version: '0.5.0'
        });
    });

    it('reads latest on the viewed package as its stable head', () => {
        const catalog = new SearchCatalog([logger]);
        expect(catalog.targets({ pkg: 'logger', version: 'latest' }, 'all', true)).toEqual([
            { id: 'logger', version: '2.1.0' }
        ]);
    });

    it('searches other packages at the head the pre-release toggle picks', () => {
        const catalog = new SearchCatalog([seedcord, logger]);
        expect(catalog.targets(onSeedcord, 'all', false)).toContainEqual({ id: 'logger', version: '2.1.0' });
        expect(catalog.targets(onSeedcord, 'all', true)).toContainEqual({ id: 'logger', version: '3.0.0-next.1' });
    });

    it('falls back to the other channel when the toggled one is empty', () => {
        expect(new SearchCatalog([{ ...logger, stable: null }]).targets(onSeedcord, 'all', false)).toEqual([
            { id: 'logger', version: '3.0.0-next.1' }
        ]);
        expect(new SearchCatalog([{ ...logger, prerelease: null }]).targets(onSeedcord, 'all', true)).toEqual([
            { id: 'logger', version: '2.1.0' }
        ]);
    });

    it('skips a package with nothing in either channel', () => {
        const catalog = new SearchCatalog([seedcord, { ...logger, stable: null, prerelease: null }]);
        expect(catalog.targets(onSeedcord, 'all', false)).toEqual([{ id: 'seedcord', version: '1.0.0' }]);
    });

    it('limits the search to the scoped package', () => {
        const catalog = new SearchCatalog([seedcord, logger]);
        expect(catalog.targets(onSeedcord, 'logger', false)).toEqual([{ id: 'logger', version: '2.1.0' }]);
    });
});
