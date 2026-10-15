import { stripVTControlCharacters } from 'node:util';

import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { commandLabel, printSections } from '#commands/commands/commandRows';
import { StepPrinter } from '#core/output/StepPrinter';

import type { Terminal } from '#core/output/terminal';

interface FakeTerminal extends Terminal {
    readonly lines: () => string[];
}

// a piped terminal reports no width
function terminal(columns?: number): FakeTerminal {
    let written = '';
    return {
        isTTY: columns !== undefined,
        columns: columns ?? 0,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        },
        lines: () => stripVTControlCharacters(written).replaceAll(' ', ' ').split('\n')
    };
}

function printerOn(stdout: FakeTerminal): StepPrinter<'scan'> {
    return new StepPrinter({ command: 'commands', labels: ['scan'], verbose: false, stdout, stderr: stdout });
}

const ban = commandLabel({ name: 'ban', type: ApplicationCommandType.ChatInput });
const kick = commandLabel({ name: 'kick', type: ApplicationCommandType.ChatInput });
const report = commandLabel({ name: 'Report User', type: ApplicationCommandType.User });
const translate = commandLabel({ name: 'Translate', type: ApplicationCommandType.Message });

describe('printSections', () => {
    it('prints each title with its note, then its commands indented under it', () => {
        const stdout = terminal();

        printSections(printerOn(stdout), [
            { title: 'Alpha', note: '3 duplicates', rows: [{ items: [ban, report, translate] }] },
            { title: 'Beta', note: '1 duplicate', rows: [{ items: [kick] }] }
        ]);

        expect(stdout.lines()).toEqual([
            '',
            '  Alpha  3 duplicates',
            '      /ban Report User (user) Translate (message)',
            '',
            '  Beta  1 duplicate',
            '      /kick',
            '',
            ''
        ]);
    });

    it('wraps at the terminal width under the same indent and keeps a context menu name whole', () => {
        const stdout = terminal(28);

        printSections(printerOn(stdout), [{ title: 'Alpha', rows: [{ items: [ban, kick, report, ban, kick] }] }]);

        expect(stdout.lines()).toEqual([
            '',
            '  Alpha',
            '      /ban /kick',
            '      Report User (user)',
            '      /ban /kick',
            '',
            ''
        ]);
    });

    it('prints a row marker ahead of the commands and wraps the row under them', () => {
        const stdout = terminal(28);

        printSections(printerOn(stdout), [
            {
                title: 'global',
                rows: [
                    { marker: '+', items: [ban, kick, report] },
                    { marker: '-', items: [translate] },
                    { items: ['1 unchanged'] }
                ]
            }
        ]);

        expect(stdout.lines()).toEqual([
            '',
            '  global',
            '    + /ban /kick',
            '      Report User (user)',
            '    - Translate (message)',
            '      1 unchanged',
            '',
            ''
        ]);
    });
});
