import { describe, expect, it } from 'vitest';

import { indexingFor, latestEntitySegments } from '#lib/indexing';

import type { EntityTone, ParsedEntityPath } from '@seedcord/docs-engine/client';

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

describe('latestEntitySegments', () => {
    const LATEST = '0.14.0';
    const index = {
        entities: { 'bot-config': 'interface', logger: 'class' },
        entitiesVersion: LATEST
    } as const;

    function parsed(tone: EntityTone | null, slug: string | null, rawSegments: string[]): ParsedEntityPath {
        return { tone, slug, rawSegments };
    }

    it('keeps the directory a symbol still lives under', () => {
        expect(latestEntitySegments(index, LATEST, parsed('class', 'logger', ['classes', 'logger']))).toEqual([
            'classes',
            'logger'
        ]);
    });

    it('swaps the directory for a symbol whose kind changed since', () => {
        expect(latestEntitySegments(index, LATEST, parsed('class', 'bot-config', ['classes', 'bot-config']))).toEqual([
            'interfaces',
            'bot-config'
        ]);
    });

    it('gives a directory to a path that carried none', () => {
        expect(latestEntitySegments(index, LATEST, parsed(null, 'logger', ['logger']))).toEqual(['classes', 'logger']);
    });

    it('keeps a multi-part slug whole', () => {
        const nested = { entities: { 'nested/thing': 'type' }, entitiesVersion: LATEST } as const;
        const path = parsed('class', 'nested/thing', ['classes', 'nested', 'thing']);
        expect(latestEntitySegments(nested, LATEST, path)).toEqual(['types', 'nested', 'thing']);
    });

    it('drops a symbol the latest version stopped documenting', () => {
        expect(
            latestEntitySegments(index, LATEST, parsed('class', 'old-thing', ['classes', 'old-thing']))
        ).toBeUndefined();
    });

    it('drops a path that parsed to no slug', () => {
        expect(latestEntitySegments(index, LATEST, parsed('class', null, ['classes']))).toBeUndefined();
    });

    it('reads a slug named after an Object prototype member off the map alone', () => {
        const path = parsed('class', 'constructor', ['classes', 'constructor']);
        const own = { entities: { constructor: 'function' }, entitiesVersion: LATEST } as const;
        expect(latestEntitySegments(index, LATEST, path)).toBeUndefined();
        expect(latestEntitySegments(own, LATEST, path)).toEqual(['functions', 'constructor']);
    });

    it('keeps the original path when the index carries no entity map', () => {
        expect(latestEntitySegments(undefined, LATEST, parsed('class', 'logger', ['classes', 'logger']))).toEqual([
            'classes',
            'logger'
        ]);
    });

    it('keeps the original path when the map describes some other version', () => {
        const fromPrerelease = { entities: { logger: 'interface' }, entitiesVersion: '0.15.0-next.0' } as const;
        expect(latestEntitySegments(fromPrerelease, LATEST, parsed('class', 'logger', ['classes', 'logger']))).toEqual([
            'classes',
            'logger'
        ]);
    });

    it('keeps a stable page indexed when a prerelease map has dropped its symbol', () => {
        const fromPrerelease = { entities: { 'new-thing': 'class' }, entitiesVersion: '0.15.0-next.0' } as const;
        expect(
            latestEntitySegments(fromPrerelease, LATEST, parsed('class', 'old-thing', ['classes', 'old-thing']))
        ).toEqual(['classes', 'old-thing']);
    });
});
