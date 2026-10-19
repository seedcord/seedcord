import { describe, expect, it } from 'vitest';

import { readingMinutes } from '#src/readingTime';

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ');

describe('readingMinutes', () => {
    it('counts code fences at 400 words a minute', () => {
        expect(readingMinutes(`${words(200)}\n\n\`\`\`ts\n${words(800)}\n\`\`\``)).toBe(3);
    });

    it('returns at least one minute', () => {
        expect(readingMinutes('hi')).toBe(1);
    });
});
