import { describe, expect, it } from 'vitest';

import { formatDuration } from '#src/formatDuration';

describe('formatDuration', () => {
    it('shows milliseconds under a second and seconds from there', () => {
        expect(formatDuration(12.4)).toBe('12ms');
        expect(formatDuration(2400)).toBe('2.4s');
    });

    it('switches to seconds when the milliseconds round up to 1000', () => {
        expect(formatDuration(999.6)).toBe('1.0s');
    });
});
