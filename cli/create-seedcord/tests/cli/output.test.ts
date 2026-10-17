import { stripVTControlCharacters } from 'node:util';

import { describe, expect, it } from 'vitest';

import { CreateOutput } from '#cli/output';
import { CommandFailed } from '#scaffold/exec';

// the selector after ✔ takes no column on screen
const TEXT_STYLE = String.fromCodePoint(0xfe_0e);

function captured(): { stdout: { write: (text: string) => boolean; isTTY: false }; text: () => string } {
    let written = '';
    return {
        stdout: {
            write: (text) => {
                written += text;
                return true;
            },
            isTTY: false
        },
        text: () => stripVTControlCharacters(written).replaceAll(TEXT_STYLE, '')
    };
}

describe('CreateOutput', () => {
    it('lines up answer rows and step rows in one label column', async () => {
        const { stdout, text } = captured();
        const output = new CreateOutput(['folder', 'transport', 'files'], stdout);

        output.answer('folder', 'my-bot');
        await output.stepRows().run('files', () => Promise.resolve());

        const [answerRow = '', stepRow = ''] = text().trimEnd().split('\n');
        const afterLabels = stepRow.indexOf('files') + 'transport  '.length;

        expect(answerRow.indexOf('folder')).toBe(stepRow.indexOf('files'));
        expect(answerRow.indexOf('my-bot')).toBe(afterLabels);
    });

    it('starts every line of a summary row in the answer column', () => {
        const { stdout, text } = captured();
        const output = new CreateOutput(['folder', 'transport'], stdout);

        output.answer('folder', 'my-bot');
        output.row('next', ['cd my-bot', 'pnpm run dev']);

        const [answerRow = '', first = '', second = ''] = text().trimEnd().split('\n');
        const column = answerRow.indexOf('my-bot');

        expect(first.indexOf('next')).toBe(answerRow.indexOf('folder'));
        expect(first.indexOf('cd my-bot')).toBe(column);
        expect(second.indexOf('pnpm run dev')).toBe(column);
    });

    it('indents every line of a warning under its first', () => {
        const { stdout, text } = captured();

        new CreateOutput(['files'], stdout).warn('pnpm add failed\nERR_PNPM_FETCH_404');

        expect(text()).toBe('  ▲ pnpm add failed\n    ERR_PNPM_FETCH_404\n');
    });

    it("prints any other failure's message under its row", async () => {
        const { stdout, text } = captured();
        const failing = new CreateOutput(['files'], stdout)
            .stepRows()
            .run('files', () => Promise.reject(new Error("EACCES: permission denied, mkdir '/bots/my-bot'")));

        await expect(failing).rejects.toThrow();

        expect(text()).toMatch(/✘ files .*\n\s+│ EACCES: permission denied, mkdir '\/bots\/my-bot'\n$/);
    });

    it('prints a failed command and its output under the row, leaving the row to say it failed', async () => {
        const { stdout, text } = captured();
        const failing = new CreateOutput(['install'], stdout)
            .stepRows()
            .run('install', () => Promise.reject(new CommandFailed('pnpm add envapt', ['ERR_PNPM_FETCH_404'])));

        await expect(failing).rejects.toThrow();

        expect(text()).toMatch(/✘ install .*\n\s+│ pnpm add envapt\n\s+│ ERR_PNPM_FETCH_404\n$/);
    });

    it('prints a failed step as a warning when there are no rows', async () => {
        const { stdout, text } = captured();
        const failing = new CreateOutput(['install'], stdout)
            .plainSteps()
            .run('install', () => Promise.reject(new Error('`pnpm add` failed.\nERR_PNPM_FETCH_404')));

        await expect(failing).rejects.toThrow();

        expect(text()).toBe('  ▲ `pnpm add` failed.\n    ERR_PNPM_FETCH_404\n');
    });

    it('marks a skipped step as skipped', () => {
        const { stdout, text } = captured();

        new CreateOutput(['install'], stdout).stepRows().skip('install');

        expect(text()).toMatch(/install\s+skipped/);
    });
});
