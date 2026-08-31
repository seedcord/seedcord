import { describe, expect, it } from 'vitest';

import { firstPages, highlightSegments, matchWindow } from '#lib/searchHighlight';

describe('the parts of a search result the query matched', () => {
    it('marks the run the query matched', () => {
        expect(highlightSegments('An <mark>autocomplete</mark> interaction')).toEqual([
            { text: 'An ', match: false, code: false },
            { text: 'autocomplete', match: true, code: false },
            { text: ' interaction', match: false, code: false }
        ]);
    });

    it('marks a whole result that is one match', () => {
        expect(highlightSegments('<mark>Autocomplete</mark>')).toEqual([
            { text: 'Autocomplete', match: true, code: false }
        ]);
    });

    it('marks every run in a result that matched twice', () => {
        const segments = highlightSegments('<mark>a</mark> and <mark>b</mark>');

        expect(segments.filter((segment) => segment.match).map((segment) => segment.text)).toEqual(['a', 'b']);
    });

    it('hands back a result the query never matched as one part', () => {
        expect(highlightSegments('Nothing matched')).toEqual([{ text: 'Nothing matched', match: false, code: false }]);
    });
});

describe('the code in a search result', () => {
    it('takes the backticks off so a row shows no markdown', () => {
        expect(highlightSegments('reads it as `ctx.core`.')).toEqual([
            { text: 'reads it as ', match: false, code: false },
            { text: 'ctx.core', match: false, code: true },
            { text: '.', match: false, code: false }
        ]);
    });

    it('marks a match that landed inside the code', () => {
        expect(highlightSegments('`no-choices-and-<mark>autocomplete</mark>`')).toEqual([
            { text: 'no-choices-and-', match: false, code: true },
            { text: 'autocomplete', match: true, code: true }
        ]);
    });

    it('drops the asterisks a bold lead-in wraps', () => {
        expect(highlightSegments('**Components.** Buttons and modals')).toEqual([
            { text: 'Components. Buttons and modals', match: false, code: false }
        ]);
    });

    it('drops the asterisks around an italic word', () => {
        expect(highlightSegments('we saw *how* and *what*')).toEqual([
            { text: 'we saw how and what', match: false, code: false }
        ]);
    });

    // remark stores an asterisk that follows a backtick as &#x2A;
    it('decodes an escaped asterisk back into its bold run', () => {
        expect(highlightSegments('**`bot.ts`*&#x2A; builds it')).toEqual([
            { text: 'bot.ts', match: false, code: true },
            { text: ' builds it', match: false, code: false }
        ]);
    });

    // a code fence row carries no backticks. a glob has to survive on its own
    it('leaves a glob alone when a row holds two of them', () => {
        const code = "eslint 'src/**/*.ts' and 'tests/**/*.ts'";

        expect(highlightSegments(code)).toEqual([{ text: code, match: false, code: false }]);
    });

    // markdown closes a span on a backtick run of the same width
    it('keeps the backtick a double backtick span wraps', () => {
        expect(highlightSegments('``a ` b``')).toEqual([{ text: 'a ` b', match: false, code: true }]);
    });

    it('leaves a lone backtick alone', () => {
        expect(highlightSegments('a ` b')).toEqual([{ text: 'a ` b', match: false, code: false }]);
    });

    // a query carrying a backtick makes fumadocs mark one
    it('shows no markup when a match starts on the opening backtick', () => {
        expect(highlightSegments('reads it as <mark>`ctx</mark>.core`.')).toEqual([
            { text: 'reads it as ', match: false, code: false },
            { text: 'ctx', match: true, code: true },
            { text: '.core', match: false, code: true },
            { text: '.', match: false, code: false }
        ]);
    });

    it('shows no markup when a match ends on the closing backtick', () => {
        expect(highlightSegments('as `ctx<mark>.core`</mark> here')).toEqual([
            { text: 'as ', match: false, code: false },
            { text: 'ctx', match: false, code: true },
            { text: '.core', match: true, code: true },
            { text: ' here', match: false, code: false }
        ]);
    });
});

describe('the window a row shows around the match', () => {
    const long = `${'a'.repeat(400)} <mark>needle</mark> ${'b'.repeat(400)}`;

    it('keeps the match visible on a long paragraph', () => {
        const shown = matchWindow(highlightSegments(long), 24, 150)
            .map((segment) => segment.text)
            .join('');

        expect(shown).toContain('needle');
        expect(shown.length).toBeLessThanOrEqual(151);
    });

    it('marks the cut with an ellipsis', () => {
        expect(matchWindow(highlightSegments(long), 24, 150)[0]?.text.startsWith('…')).toBe(true);
    });

    it('leaves a short result whole', () => {
        const short = highlightSegments('a <mark>needle</mark> here');

        expect(matchWindow(short, 24, 150)).toEqual(short);
    });

    it('leaves a result with no match alone', () => {
        const none = highlightSegments('nothing matched here');

        expect(matchWindow(none, 24, 150)).toEqual(none);
    });
});

describe('how many pages a search shows', () => {
    const rows = [
        { type: 'page' as const, id: 'p1' },
        { type: 'text' as const, id: 't1' },
        { type: 'page' as const, id: 'p2' },
        { type: 'heading' as const, id: 'h1' },
        { type: 'page' as const, id: 'p3' }
    ];

    it('keeps each page rows with it', () => {
        expect(firstPages(rows, 2).map((row) => row.id)).toEqual(['p1', 't1', 'p2', 'h1']);
    });

    it('returns everything when the limit is past the count', () => {
        expect(firstPages(rows, 9)).toEqual(rows);
    });
});
