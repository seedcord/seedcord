import { describe, expect, it } from 'vitest';

import { helpText } from '#cli/help';
import { STEPS } from '#interview/steps';

describe('helpText', () => {
    it('lists every flag the interview reads, each beside what it does', () => {
        const lines = helpText().split('\n');
        const listed = (name: string, description: string): boolean =>
            lines.some((line) => line.trim().startsWith(`--${name} `) && line.trimEnd().endsWith(description));

        for (const { flag } of STEPS) {
            expect(listed(flag.name, flag.description)).toBe(true);
            if (flag.noFlag !== undefined) expect(listed(`no-${flag.name}`, flag.noFlag)).toBe(true);
        }
    });

    it('shows the shorthand beside the flag it stands for', () => {
        const text = helpText();

        expect(text).toContain('-h, --help');
        expect(text).toContain('-v, --version');
    });
});
