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

function started(write: (text: string) => void, label: string, labelWidth: number): StepRow {
    return new StepRow({ write, label, labelWidth, animate: false }).start();
}

describe('StepRow', () => {
    it('pads the label to the width and puts the time and note after it', () => {
        const out = piped();

        started(out.write, 'files', 9).done([], '12 written');

        expect(out.text()).toMatch(
            new RegExp(String.raw`^ {2}${paint.check} files {4} {2}\s+\d+ms {2}12 written\n$`, 'u')
        );
    });

    it('marks a failed step with a cross', () => {
        const out = piped();

        started(out.write, 'install', 7).failed([]);

        expect(out.text().startsWith(`  ${paint.cross} install`)).toBe(true);
    });

    it('prints the lines it gets under the row', () => {
        const out = piped();

        started(out.write, 'install', 7).failed(['npm error code ECONNREFUSED']);

        expect(out.text().split('\n')[1]).toBe('      │ npm error code ECONNREFUSED');
    });

    it('prints a line above the row while the step runs', () => {
        const out = piped();
        const row = started(out.write, 'install', 7);

        row.printAbove('▲ cache is stale');

        expect(out.text()).toBe('  ▲ cache is stale\n');
        row.done([]);
    });
});
