import { describe, expect, it } from 'vitest';

import { rankByCoverage } from '#lib/searchRank';

interface Row {
    type: 'page' | 'heading' | 'text';
    id: string;
    content: string;
    url: string;
}

const page = (id: string, content: string): Row => ({ type: 'page', id, content, url: `/${id}` });
const text = (id: string, content: string): Row => ({ type: 'text', id, content, url: `/${id}` });

describe('the page a whole phrase should land on', () => {
    // a two word block outscores a long paragraph under BM25, even when the paragraph answers the question
    const results: Row[] = [
        page('missing', 'Why your command has not appeared'),
        text('missing-1', 'slash commands'),
        text('missing-2', 'Discord caps how many commands an application registers'),
        page('messages', 'Handling messages'),
        text('messages-1', 'that could be migrated to slash commands? It answers by pointing at slash commands')
    ];

    it('puts the page covering every word first', () => {
        const ranked = rankByCoverage(results, 'migrated slash commands');

        expect(ranked[0]?.id).toBe('messages');
    });

    it('keeps each page rows underneath it', () => {
        const ranked = rankByCoverage(results, 'migrated slash commands');

        expect(ranked.map((row) => row.id)).toEqual(['messages', 'messages-1', 'missing', 'missing-1', 'missing-2']);
    });

    it('leaves the order alone when both pages cover the same words', () => {
        const ranked = rankByCoverage(results, 'commands');

        expect(ranked.map((row) => row.id)).toEqual(results.map((row) => row.id));
    });

    it('leaves the order alone for an empty query', () => {
        expect(rankByCoverage(results, '').map((row) => row.id)).toEqual(results.map((row) => row.id));
    });

    it('counts a word the search marked up', () => {
        const marked: Row[] = [
            page('a', 'A'),
            text('a-1', 'slash'),
            page('b', 'B'),
            text('b-1', '<mark>slash</mark> and <mark>commands</mark>')
        ];

        expect(rankByCoverage(marked, 'slash commands')[0]?.id).toBe('b');
    });

    it('counts a prefix match, since the index matches on prefixes', () => {
        const rows: Row[] = [page('a', 'A'), text('a-1', 'runs'), page('b', 'B'), text('b-1', 'migrateDown runs')];

        expect(rankByCoverage(rows, 'migrate runs')[0]?.id).toBe('b');
    });

    // coverage can only be 0 or 1 on a one word query
    it('leaves a single word query to the index', () => {
        const ranked = rankByCoverage(results, 'migrated');

        expect(ranked.map((row) => row.id)).toEqual(results.map((row) => row.id));
    });
});

describe('the page a query names outright', () => {
    it('puts a title that covers the query above a page that only mentions it', () => {
        const rows: Row[] = [
            page('lint', 'Linting'),
            text('lint-1', 'use-custom-id-codec'),
            text('lint-2', 'use-paint-in-logs'),
            page('custom-ids', 'Custom IDs'),
            text('custom-ids-1', 'A wire from a different id')
        ];

        expect(rankByCoverage(rows, 'custom id')[0]?.id).toBe('custom-ids');
    });

    it('keeps a page covering every word above a title that catches one', () => {
        const rows: Row[] = [
            page('commands', 'Commands'),
            text('commands-1', 'slash commands live here'),
            page('messages', 'Handling messages'),
            text('messages-1', 'that could be migrated to slash commands')
        ];

        expect(rankByCoverage(rows, 'migrated slash commands')[0]?.id).toBe('messages');
    });

    it('puts the shorter title first when two titles both cover the query', () => {
        const rows: Row[] = [
            page('stale', 'When a custom id goes stale'),
            text('stale-1', 'A corrupt string throws here'),
            page('custom-ids', 'Custom IDs'),
            text('custom-ids-1', 'A wire from a different id')
        ];

        expect(rankByCoverage(rows, 'custom id')[0]?.id).toBe('custom-ids');
    });
});
