import { describe, expect, it } from 'vitest';

import { pluralize } from '#src/strings/pluralize';

describe('pluralize', () => {
    it('keeps the singular for exactly one', () => {
        expect(pluralize(1, 'command')).toBe('command');
    });

    it.each([0, 2, 1.5])('adds an s for %d', (count) => {
        expect(pluralize(count, 'command')).toBe('commands');
    });

    it('uses an irregular plural when given one', () => {
        expect(pluralize(3, 'child', 'children')).toBe('children');
    });
});
