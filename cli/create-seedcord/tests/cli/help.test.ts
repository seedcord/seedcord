import { describe, expect, it } from 'vitest';

import { helpText } from '#cli/help';
import { STEPS } from '#interview/steps';

describe('helpText', () => {
    it('lists every flag the interview asks for', () => {
        const text = helpText();

        for (const step of STEPS) {
            expect(text).toContain(`--${step.flag.name}`);
        }
    });

    it('shows the shorthand beside the flag it stands for', () => {
        const text = helpText();

        expect(text).toContain('-h, --help');
        expect(text).toContain('-v, --version');
    });
});
