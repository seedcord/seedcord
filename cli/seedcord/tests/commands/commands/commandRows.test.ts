import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { commandLabel } from '#commands/commands/commandRows';
import { printSections } from '#core/output/printSections';
import { StepPrinter } from '#core/output/StepPrinter';
import { fakeTerminal } from '#tests/fakeTerminal';

describe('commandLabel', () => {
    it('keeps a context menu name whole when its row wraps', () => {
        const stdout = fakeTerminal(28);
        const printer = new StepPrinter({
            command: 'commands',
            labels: ['scan'],
            verbose: false,
            stdout,
            stderr: stdout
        });
        const ban = commandLabel({ name: 'ban', type: ApplicationCommandType.ChatInput });
        const report = commandLabel({ name: 'Report User', type: ApplicationCommandType.User });

        printSections(printer, [{ title: 'Alpha', rows: [{ items: [ban, ban, report, ban] }] }]);

        expect(stdout.text().split('\n')).toEqual([
            '',
            '  Alpha',
            '      /ban /ban',
            '      Report User (user)',
            '      /ban',
            '',
            ''
        ]);
    });
});
