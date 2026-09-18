import { describe, expect, it } from 'vitest';

import { indexingFor, latestHasEntity } from '#lib/indexing';

const IN_LATEST = '/packages/types/0.13.0/interfaces/bot-config';

describe('indexingFor', () => {
    it('points a page at its twin in the latest version', () => {
        expect(indexingFor(IN_LATEST)).toEqual({ canonicalPath: IN_LATEST });
    });

    it('keeps a page the latest version dropped out of the index', () => {
        expect(indexingFor(undefined)).toEqual({ robots: { index: false, follow: true } });
    });

    it('claims no canonical for a dropped page', () => {
        expect(indexingFor(undefined).canonicalPath).toBeUndefined();
    });

    it('sets no robots rule on a page that still exists', () => {
        expect(indexingFor(IN_LATEST).robots).toBeUndefined();
    });
});

describe('latestHasEntity', () => {
    const entities = { 'bot-config': 'interface', logger: 'class' };

    it('finds a slug the latest version documents', () => {
        expect(latestHasEntity(entities, 'bot-config')).toBe(true);
    });

    it('misses a slug the latest version dropped', () => {
        expect(latestHasEntity(entities, 'old-thing')).toBe(false);
    });

    it('reads a slug named after an Object prototype member off the map alone', () => {
        expect(latestHasEntity(entities, 'constructor')).toBe(false);
        expect(latestHasEntity({ constructor: 'class' }, 'constructor')).toBe(true);
    });

    it('keeps every page canonical when the index carries no entity map', () => {
        expect(latestHasEntity(undefined, 'anything')).toBe(true);
    });

    it('misses a path that parsed to no slug', () => {
        expect(latestHasEntity(entities, null)).toBe(false);
    });
});
