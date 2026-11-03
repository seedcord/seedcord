import { describe, expect, it } from 'vitest';

import { parseQuestion, QUESTION_LENGTH } from '#src/question';

describe('parseQuestion', () => {
    it('trims a question and collapses its whitespace', () => {
        expect(parseQuestion('  how do\n\ni   refuse ')).toBe('how do i refuse');
    });

    it('takes a question at either end of the length limit', () => {
        const longest = 'k'.repeat(QUESTION_LENGTH.max);

        expect(parseQuestion('ok')).toBe('ok');
        expect(parseQuestion(longest)).toBe(longest);
    });

    it('takes a bare number, since it can be an error code', () => {
        expect(parseQuestion('3116')).toBe('3116');
    });

    it.each([
        ['empty', '   '],
        ['too short', ' k '],
        ['too long', 'k'.repeat(QUESTION_LENGTH.max + 1)],
        ['only punctuation', '!!!!']
    ])('rejects a question that is %s', (_, input) => {
        expect(parseQuestion(input)).toBeUndefined();
    });
});
