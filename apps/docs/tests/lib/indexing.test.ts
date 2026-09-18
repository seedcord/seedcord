import { describe, expect, it } from 'vitest';

import { latestEntitySegments } from '#lib/indexing';

import type { EntityTone, ParsedEntityPath } from '@seedcord/docs-engine/client';

describe('latestEntitySegments', () => {
    const entities = { 'bot-config': 'interface', logger: 'class' } as const;

    function parsed(tone: EntityTone | null, slug: string | null, rawSegments: string[]): ParsedEntityPath {
        return { tone, slug, rawSegments };
    }

    it('keeps the directory a symbol still lives under', () => {
        expect(latestEntitySegments(entities, parsed('class', 'logger', ['classes', 'logger']))).toEqual([
            'classes',
            'logger'
        ]);
    });

    it('swaps the directory for a symbol whose kind changed since', () => {
        expect(latestEntitySegments(entities, parsed('class', 'bot-config', ['classes', 'bot-config']))).toEqual([
            'interfaces',
            'bot-config'
        ]);
    });

    it('gives a directory to a path that carried none', () => {
        expect(latestEntitySegments(entities, parsed(null, 'logger', ['logger']))).toEqual(['classes', 'logger']);
    });

    it('keeps a multi-part slug whole', () => {
        const nested = { 'nested/thing': 'type' } as const;
        const path = parsed('class', 'nested/thing', ['classes', 'nested', 'thing']);
        expect(latestEntitySegments(nested, path)).toEqual(['types', 'nested', 'thing']);
    });

    it('drops a symbol the latest version stopped documenting', () => {
        expect(latestEntitySegments(entities, parsed('class', 'old-thing', ['classes', 'old-thing']))).toBeUndefined();
    });

    it('drops a path that parsed to no slug', () => {
        expect(latestEntitySegments(entities, parsed('class', null, ['classes']))).toBeUndefined();
    });

    it('reads a slug named after an Object prototype member off the map alone', () => {
        const path = parsed('class', 'constructor', ['classes', 'constructor']);
        expect(latestEntitySegments(entities, path)).toBeUndefined();
        expect(latestEntitySegments({ constructor: 'function' } as const, path)).toEqual(['functions', 'constructor']);
    });

    it('keeps the original path when the index carries no entity map', () => {
        expect(latestEntitySegments(undefined, parsed('class', 'logger', ['classes', 'logger']))).toEqual([
            'classes',
            'logger'
        ]);
    });
});
