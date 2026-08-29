import { describe, it, expect } from 'vitest';

import { renderTable } from '#src/strings/renderTable';

const wideRanges: readonly (readonly [number, number])[] = [
    [0x11_00, 0x11_5f],
    [0x2e_80, 0x30_3e],
    [0x30_41, 0x33_ff],
    [0x34_00, 0x4d_bf],
    [0x4e_00, 0x9f_ff],
    [0xa0_00, 0xa4_cf],
    [0xac_00, 0xd7_a3],
    [0xf9_00, 0xfa_ff],
    [0xfe_30, 0xfe_4f],
    [0xff_00, 0xff_60],
    [0xff_e0, 0xff_e6],
    [0x1_f3_00, 0x1_fa_ff],
    [0x2_00_00, 0x3_ff_fd]
];

function refWidth(text: string): number {
    let width = 0;
    for (const ch of text) {
        const cp = ch.codePointAt(0) ?? 0;
        const wide = wideRanges.some(([lo, hi]) => cp >= lo && cp <= hi);
        width += wide ? 2 : 1;
    }
    return width;
}

function frameWidths(table: string): number[] {
    return table
        .split('\n')
        .filter((line) => line.length > 0)
        .map(refWidth);
}

describe('renderTable display width', () => {
    it('keeps borders aligned when a cell holds a wide CJK character', () => {
        const table = renderTable([['a'], ['本']]);
        const widths = new Set(frameWidths(table));
        expect(widths.size).toBe(1);
    });
});

describe('renderTable newline neutralization', () => {
    it('collapses a newline inside a cell to a single space without leaking a physical line', () => {
        const table = renderTable([['a\nb']]);
        const widths = new Set(frameWidths(table));
        expect(widths.size).toBe(1);
        expect(table).toContain('a b');
        expect(table).not.toContain('a\nb');
    });

    it('collapses a windows CRLF inside a cell to a single space', () => {
        const table = renderTable([['a\r\nb']]);
        expect(table).toContain('a b');
        expect(table).not.toContain('\r');
    });
});

describe('renderTable ragged rows', () => {
    it('keeps the border aligned when a later row is wider than the first', () => {
        const table = renderTable([['a'], ['b', 'c']]);
        const widths = new Set(frameWidths(table));
        expect(widths.size).toBe(1);
    });

    it('uses the widest row to fix the column count', () => {
        const table = renderTable([['a'], ['b', 'c', 'd']]);
        const verticals = table
            .split('\n')[1]
            ?.split('')
            .filter((ch) => ch === '│').length;
        expect(verticals).toBe(4);
    });

    it('fills a missing trailing cell with emptyCell', () => {
        const table = renderTable([['x', 'y'], ['z']], { emptyCell: '-' });
        const bodyRow = table.split('\n').find((line) => line.includes('z'));
        expect(bodyRow).toContain('-');
    });

    it('fills an empty existing cell with emptyCell', () => {
        const table = renderTable([['', 'y']], { emptyCell: '.' });
        expect(table).toContain('.');
    });
});

function bodyCell(table: string, rowIndexFromTop: number, column: number): string {
    const line = table.split('\n')[rowIndexFromTop] ?? '';
    return line.split('│')[column + 1] ?? '';
}

describe('renderTable alignment', () => {
    it('left-aligns by default with padding on the trailing side', () => {
        const table = renderTable([['hi'], ['longer']]);
        expect(bodyCell(table, 1, 0)).toBe(' hi     ');
    });

    it('right-aligns when align is right', () => {
        const table = renderTable([['hi'], ['longer']], { align: 'right' });
        expect(bodyCell(table, 1, 0)).toBe('     hi ');
    });

    it('center-aligns and puts the odd extra space on the right', () => {
        const table = renderTable([['x'], ['abcd']], { align: 'center' });
        expect(bodyCell(table, 1, 0)).toBe('  x   ');
    });

    it('applies a per-column alignment array', () => {
        const table = renderTable(
            [
                ['hi', 'yo'],
                ['longer', 'wider!']
            ],
            { align: ['right', 'left'] }
        );
        expect(bodyCell(table, 1, 0)).toBe('     hi ');
        expect(bodyCell(table, 1, 1)).toBe(' yo     ');
    });

    it('falls back to left for columns past the end of the align array', () => {
        const table = renderTable(
            [
                ['hi', 'yo'],
                ['longer', 'wider!']
            ],
            { align: ['right'] }
        );
        expect(bodyCell(table, 1, 1)).toBe(' yo     ');
    });
});

describe('renderTable border styles', () => {
    it('uses rounded glyphs by default', () => {
        const table = renderTable([['a']]);
        expect(table.split('\n')[0]).toBe('╭───╮');
    });

    it('draws rounded corners with the rounded preset', () => {
        const table = renderTable([['a']], { border: 'rounded' });
        const lines = table.split('\n');
        expect(lines[0]).toBe('╭───╮');
        expect(lines.at(-2)).toBe('╰───╯');
    });

    it('draws pure ascii with the ascii preset', () => {
        const table = renderTable([['a']], { border: 'ascii' });
        const lines = table.split('\n');
        expect(lines[0]).toBe('+---+');
        expect(lines[1]).toBe('| a |');
    });

    it('emits valid GFM markdown with a pipe header and delimiter row and no outer frame', () => {
        const table = renderTable(
            [
                ['h1', 'h2'],
                ['a', 'b']
            ],
            { border: 'markdown' }
        );
        const lines = table.split('\n').filter((line) => line.length > 0);
        expect(lines[0]).toBe('| h1 | h2 |');
        expect(lines[1]).toBe('| --- | --- |');
        expect(lines[2]).toBe('| a  | b  |');
        expect(lines.length).toBe(3);
    });
});

describe('renderTable markdown alignment and escaping', () => {
    it('encodes column alignment in the delimiter row', () => {
        const table = renderTable(
            [
                ['a', 'b', 'c'],
                ['1', '2', '3']
            ],
            { border: 'markdown', align: ['left', 'center', 'right'] }
        );
        expect(table.split('\n')[1]).toBe('| --- | :---: | ---: |');
    });

    it('escapes pipe and backslash in cell content so the row is not corrupted', () => {
        const table = renderTable([['a|b', String.raw`c\d`]], { border: 'markdown' });
        const header = table.split('\n')[0];
        expect(header).toContain(String.raw`a\|b`);
        expect(header).toContain(String.raw`c\\d`);
    });

    it('caps a cell at maxWidth without asking for truncate, since a GFM cell cannot wrap', () => {
        const table = renderTable([['description'], ['hello world this is long']], {
            border: 'markdown',
            maxWidth: 10
        });
        const lines = table.split('\n');
        expect(lines[0]).toBe('| descripti… |');
        expect(lines[2]).toBe('| hello wor… |');
    });

    it('keeps row 0 as data under header false, with an empty header above the delimiter', () => {
        const table = renderTable(
            [
                ['a', 'b'],
                ['c', 'd']
            ],
            { border: 'markdown', header: false }
        );
        const lines = table.split('\n').filter((line) => line.length > 0);
        expect(lines[0]).toBe('|   |   |');
        expect(lines[1]).toBe('| --- | --- |');
        expect(lines[2]).toBe('| a | b |');
        expect(lines[3]).toBe('| c | d |');
    });
});

describe('renderTable header control', () => {
    it('draws a separator under row 0 by default', () => {
        const table = renderTable([['head'], ['body']]);
        const lines = table.split('\n');
        expect(lines[2]).toBe('├──────┤');
    });

    it('draws light separators between body rows', () => {
        const table = renderTable([['head'], ['a'], ['b']]);
        const lines = table.split('\n');
        expect(lines[2]).toBe('├──────┤');
        expect(lines[4]).toBe('├──────┤');
    });

    it('draws a uniform light separator everywhere when header is false', () => {
        const table = renderTable([['a'], ['b'], ['c']], { header: false });
        const lines = table.split('\n');
        expect(lines[2]).toBe('├───┤');
        expect(lines[4]).toBe('├───┤');
    });
});

describe('renderTable padding', () => {
    it('widens the cell gaps and the border to match a larger padding', () => {
        const table = renderTable([['a']], { padding: 3 });
        const lines = table.split('\n');
        expect(lines[0]).toBe('╭───────╮');
        expect(lines[1]).toBe('│   a   │');
    });

    it('removes the cell gaps with zero padding', () => {
        const table = renderTable([['a']], { padding: 0 });
        const lines = table.split('\n');
        expect(lines[0]).toBe('╭─╮');
        expect(lines[1]).toBe('│a│');
    });
});

describe('renderTable numeric auto-align', () => {
    it('right-aligns a column whose non-empty cells are all numeric', () => {
        const table = renderTable([['5'], ['1000']], { numericAlign: true });
        expect(bodyCell(table, 1, 0)).toBe('    5 ');
    });

    it('ignores empty cells when deciding a column is numeric', () => {
        const table = renderTable([['5'], [''], ['1000']], { numericAlign: true });
        expect(bodyCell(table, 1, 0)).toBe('    5 ');
    });

    it('leaves a mixed column left-aligned', () => {
        const table = renderTable([['5'], ['n/a'], ['1000']], { numericAlign: true });
        expect(bodyCell(table, 1, 0)).toBe(' 5    ');
    });

    it('lets an explicit per-column align beat numeric auto-align', () => {
        const table = renderTable([['5'], ['1000']], { numericAlign: true, align: ['left'] });
        expect(bodyCell(table, 1, 0)).toBe(' 5    ');
    });

    it('right-aligns a numeric body even when the header text is non-numeric', () => {
        const table = renderTable([['Score'], ['100'], ['9']], { numericAlign: true });
        expect(bodyCell(table, 5, 0)).toBe('     9 ');
    });

    it('treats the header row as data when header is false so a non-numeric first row blocks auto-align', () => {
        const table = renderTable([['Score'], ['100'], ['9']], { numericAlign: true, header: false });
        expect(bodyCell(table, 5, 0)).toBe(' 9     ');
    });
});

describe('renderTable maxWidth truncate', () => {
    it('cuts an over-wide cell to maxWidth with a trailing ellipsis', () => {
        const table = renderTable([['hello world']], { maxWidth: 5, overflow: 'truncate' });
        expect(table).toContain('hell…');
        expect(table).not.toContain('hello world');
    });

    it('keeps the border at the maxWidth bound when truncating', () => {
        const table = renderTable([['hello world']], { maxWidth: 5, overflow: 'truncate' });
        const widths = new Set(frameWidths(table));
        expect(widths.size).toBe(1);
        expect([...widths][0]).toBe(9);
    });

    it('leaves a cell at or under maxWidth untouched', () => {
        const table = renderTable([['hi']], { maxWidth: 5, overflow: 'truncate' });
        expect(table).toContain(' hi ');
        expect(table).not.toContain('…');
    });
});

function bodyLines(table: string): string[] {
    return table.split('\n').filter((line) => line.includes('│'));
}

describe('renderTable maxWidth wrap', () => {
    it('word-wraps an over-wide cell onto multiple physical lines', () => {
        const table = renderTable([['hello world']], { maxWidth: 5 });
        const rows = bodyLines(table);
        expect(rows[0]).toBe('│ hello │');
        expect(rows[1]).toBe('│ world │');
    });

    it('keeps every framed line at the same display width while wrapping', () => {
        const table = renderTable([['hello world']], { maxWidth: 5 });
        const widths = new Set(frameWidths(table));
        expect(widths.size).toBe(1);
    });

    it('hard-breaks a single token longer than maxWidth', () => {
        const table = renderTable([['abcdefgh']], { maxWidth: 3 });
        const rows = bodyLines(table);
        expect(rows[0]).toBe('│ abc │');
        expect(rows[1]).toBe('│ def │');
        expect(rows[2]).toBe('│ gh  │');
    });

    it('pads shorter cells in a wrapped row with blank lines, top-aligned', () => {
        const table = renderTable([['hello world', 'x']], { maxWidth: 5 });
        const rows = bodyLines(table);
        expect(rows[0]).toBe('│ hello │ x │');
        expect(rows[1]).toBe('│ world │   │');
    });
});

describe('renderTable pagination', () => {
    it('returns a single page identical to the un-paged table when it fits the budget', () => {
        const data = [
            ['Name', 'Age'],
            ['Alice', '30']
        ];
        const pages = renderTable(data, { budget: 2000 });
        expect(pages).toHaveLength(1);
        expect(pages[0]).toBe(renderTable(data));
    });

    it('splits into multiple pages that each stay within the budget', () => {
        const data = [['ID', 'Value'], ...Array.from({ length: 12 }, (_, i) => [String(i), 'xxxxx'])];
        const pages = renderTable(data, { budget: 120 });
        expect(pages.length).toBeGreaterThan(1);
        for (const page of pages) expect(page.length).toBeLessThanOrEqual(120);
    });

    it('re-emits the header on every page', () => {
        const data = [['ID', 'Value'], ...Array.from({ length: 12 }, (_, i) => [String(i), 'xxxxx'])];
        const pages = renderTable(data, { budget: 120 });
        for (const page of pages) {
            expect(page).toContain('ID');
            expect(page).toContain('Value');
        }
    });

    it('keeps every body row across the pages, none dropped', () => {
        const data = [['ID', 'Value'], ...Array.from({ length: 12 }, (_, i) => [`row${i}`, 'v'])];
        const pages = renderTable(data, { budget: 120 });
        const joined = pages.join('');
        for (let i = 0; i < 12; i++) expect(joined).toContain(`row${i}`);
    });

    it('gives a single over-budget row its own page rather than dropping it', () => {
        const data = [['H'], ['x'.repeat(50)]];
        const pages = renderTable(data, { budget: 10 });
        expect(pages).toHaveLength(1);
        expect(pages[0]).toContain('x'.repeat(50));
    });

    it('treats every row as a body row when header is false', () => {
        const data = [['a'], ['b'], ['c']];
        const pages = renderTable(data, { header: false, budget: 2000 });
        expect(pages).toHaveLength(1);
        expect(pages[0]).toBe(renderTable(data, { header: false }));
    });

    it('returns an empty array for empty input', () => {
        expect(renderTable([], { budget: 2000 })).toEqual([]);
    });

    it('renders a header-only table as a single page', () => {
        const data = [['Only', 'Header']];
        const pages = renderTable(data, { budget: 2000 });
        expect(pages).toHaveLength(1);
        expect(pages[0]).toBe(renderTable(data));
    });

    it('respects an explicit budget of 2000', () => {
        const data = [['ID', 'Value'], ...Array.from({ length: 200 }, (_, i) => [String(i), 'xxxxx'])];
        const pages = renderTable(data, { budget: 2000 });
        expect(pages.length).toBeGreaterThan(1);
        for (const page of pages) expect(page.length).toBeLessThanOrEqual(2000);
    });
});

describe('renderTable code-block fence', () => {
    it('wraps the single-string output in a triple-backtick block', () => {
        const table = renderTable([['a']], { fence: true });
        expect(table.startsWith('```\n')).toBe(true);
        expect(table.endsWith('```')).toBe(true);
        expect(table).toContain(renderTable([['a']]));
    });

    it('leaves the output un-fenced by default', () => {
        const table = renderTable([['a']]);
        expect(table.startsWith('```')).toBe(false);
    });

    it('wraps every page when paginating', () => {
        const data = [['ID', 'Value'], ...Array.from({ length: 12 }, (_, i) => [String(i), 'xxxxx'])];
        const pages = renderTable(data, { budget: 200, fence: true });
        for (const page of pages) {
            expect(page.startsWith('```\n')).toBe(true);
            expect(page.endsWith('```')).toBe(true);
        }
    });

    it('counts the fence characters against the page budget', () => {
        const data = [['ID', 'Value'], ...Array.from({ length: 12 }, (_, i) => [String(i), 'xxxxx'])];
        const pages = renderTable(data, { budget: 200, fence: true });
        for (const page of pages) expect(page.length).toBeLessThanOrEqual(200);
    });
});

describe('renderTable option validation', () => {
    it('rejects a non-integer maxWidth', () => {
        expect(() => renderTable([['a']], { maxWidth: 2.5 })).toThrow(/maxWidth/);
    });

    // guarded because a zero or negative maxWidth would loop forever in hardBreak
    it('rejects a zero maxWidth', () => {
        expect(() => renderTable([['a']], { maxWidth: 0 })).toThrow(/maxWidth/);
    });

    it('rejects a negative maxWidth', () => {
        expect(() => renderTable([['a']], { maxWidth: -3 })).toThrow(/maxWidth/);
    });

    it('rejects a negative padding', () => {
        expect(() => renderTable([['a']], { padding: -1 })).toThrow(/padding/);
    });

    it('rejects a non-integer padding', () => {
        expect(() => renderTable([['a']], { padding: 1.5 })).toThrow(/padding/);
    });

    it('accepts zero padding and a positive integer maxWidth', () => {
        expect(() => renderTable([['hello world']], { padding: 0, maxWidth: 5 })).not.toThrow();
    });
});
