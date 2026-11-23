import { describe, expect, it } from 'vite-plus/test';

import { printSections } from '#core/output/printSections';
import { StepPrinter } from '#core/output/StepPrinter';
import { fakeTerminal } from '#tests/fakeTerminal';

import type { Section } from '#core/output/printSections';

// a piped terminal doesn't report a width
function printed(sections: readonly Section[], columns?: number): string[] {
    const stdout = fakeTerminal(columns);
    const printer = new StepPrinter({ command: 'commands', labels: ['scan'], verbose: false, stdout, stderr: stdout });
    printSections(printer, sections);
    return stdout.text().split('\n');
}

describe('printSections', () => {
    it('prints each title with its note, then its items indented under it', () => {
        const lines = printed([
            { title: 'Alpha', note: '3 duplicates', rows: [{ items: ['/ban', '/report', '/translate'] }] },
            { title: 'Beta', note: '1 duplicate', rows: [{ items: ['/kick'] }] }
        ]);

        expect(lines).toEqual([
            '',
            '  Alpha  3 duplicates',
            '      /ban /report /translate',
            '',
            '  Beta  1 duplicate',
            '      /kick',
            '',
            ''
        ]);
    });

    it('wraps at the terminal width under the same indent', () => {
        const items = ['/ban', '/kick', '/a-long-command-name', '/ban', '/kick'];

        expect(printed([{ title: 'Alpha', rows: [{ items }] }], 28)).toEqual([
            '',
            '  Alpha',
            '      /ban /kick',
            '      /a-long-command-name',
            '      /ban /kick',
            '',
            ''
        ]);
    });

    it('prints a row marker before the items and wraps the row under them', () => {
        const rows = [
            { marker: '+', items: ['/ban', '/kick', '/a-long-command-name'] },
            { marker: '-', items: ['/translate'] },
            { items: ['1 unchanged'] }
        ];

        expect(printed([{ title: 'global', rows }], 28)).toEqual([
            '',
            '  global',
            '    + /ban /kick',
            '      /a-long-command-name',
            '    - /translate',
            '      1 unchanged',
            '',
            ''
        ]);
    });
});
