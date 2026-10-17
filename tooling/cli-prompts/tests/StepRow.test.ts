import { stripVTControlCharacters } from 'node:util';

import { paint } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { StepRow } from '#src/StepRow';

function piped(): { write: (text: string) => void; text: () => string } {
    let written = '';
    return {
        write: (text) => {
            written += text;
        },
        text: () => stripVTControlCharacters(written)
    };
}

function rowFor(write: (text: string) => void, label: string, labelWidth: number): StepRow {
    return new StepRow({ write, label, labelWidth, animate: false });
}

const NOTHING_UNDER = { done: () => ({ lines: [] }), linesUnderFailure: () => [] };

describe('StepRow', () => {
    it('pads the label to the width and puts the time and the note from the result after it', async () => {
        const out = piped();

        await rowFor(out.write, 'files', 9).run(() => Promise.resolve(12), {
            ...NOTHING_UNDER,
            done: (count) => ({ lines: [], note: `${count} written` })
        });

        expect(out.text()).toMatch(
            new RegExp(String.raw`^ {2}${paint.check} files {4} {2}\s+\d+ms {2}12 written\n$`, 'u')
        );
    });

    it('resolves with what the task returned', async () => {
        const out = piped();

        await expect(rowFor(out.write, 'files', 5).run(() => Promise.resolve('done'), NOTHING_UNDER)).resolves.toBe(
            'done'
        );
    });

    it('marks a failed task with a cross, prints its lines under the row, and rethrows', async () => {
        const out = piped();
        const failing = rowFor(out.write, 'install', 7).run(() => Promise.reject(new Error('ECONNREFUSED')), {
            ...NOTHING_UNDER,
            linesUnderFailure: (error) => [`npm error code ${Error.isError(error) ? error.message : ''}`]
        });

        await expect(failing).rejects.toThrow('ECONNREFUSED');

        const [row = '', under = ''] = out.text().split('\n');
        expect(row.startsWith(`  ${paint.cross} install`)).toBe(true);
        expect(under).toBe('      │ npm error code ECONNREFUSED');
    });

    it('lets a throwing done callback through without marking the row failed', async () => {
        const out = piped();
        const run = rowFor(out.write, 'files', 5).run(() => Promise.resolve(1), {
            done: () => {
                throw new Error('note broke');
            },
            linesUnderFailure: () => ['should not print']
        });

        await expect(run).rejects.toThrow('note broke');
        expect(out.text()).not.toContain('should not print');
    });

    it('prints a line above the row while the task runs', async () => {
        const out = piped();
        const row = rowFor(out.write, 'install', 7);

        await row.run(() => {
            row.printAbove('▲ cache is stale');
            expect(out.text()).toBe('  ▲ cache is stale\n');
            return Promise.resolve();
        }, NOTHING_UNDER);
    });
});
