import { describe, expect, it } from 'vitest';

import { readingMinutes } from '#src/readingTime';

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ');

describe('readingMinutes', () => {
    it('counts prose at 200 words a minute', () => {
        expect(readingMinutes(words(600))).toBe(3);
    });

    it('counts code fences at 100 words a minute', () => {
        expect(readingMinutes(`${words(200)}\n\n\`\`\`ts\n${words(800)}\n\`\`\``)).toBe(3);
    });

    it('returns at least one minute', () => {
        expect(readingMinutes('hi')).toBe(1);
    });
});
