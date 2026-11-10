import { describe, expect, it } from 'vite-plus/test';

import { parseQuestion, QUESTION_LENGTH, questionFromText } from '#src/question';

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

describe('questionFromText', () => {
    it('removes stack frames from a pasted error and leaves lines that only start with at', () => {
        const pasted = [
            '[3116] Add seedcord to ./ as a dev dependency',
            '    at assertProjectInstall (file:///bot/node_modules/seedcord/dist/cli.mjs:12:9)',
            '    at file:///bot/src/bot.ts:3:1',
            '    at async Promise.all (index 0)',
            '    at new Promise (<anonymous>)',
            '    at <anonymous>',
            'at what point does this run'
        ].join('\n');

        expect(questionFromText(pasted)).toEqual({
            question: '[3116] Add seedcord to ./ as a dev dependency at what point does this run',
            shortened: false
        });
    });

    it('cuts a long paste at a word and says it did', () => {
        const { question, shortened } = questionFromText('word '.repeat(QUESTION_LENGTH.max));

        expect(shortened).toBe(true);
        expect(question?.length).toBeLessThanOrEqual(QUESTION_LENGTH.max);
        expect(question?.endsWith('word')).toBe(true);
    });

    it('cuts a long paste with no spaces at the limit', () => {
        const { question, shortened } = questionFromText('k'.repeat(QUESTION_LENGTH.max + 1));

        expect(shortened).toBe(true);
        expect(question).toHaveLength(QUESTION_LENGTH.max);
    });

    it('has no question when only punctuation is left', () => {
        expect(questionFromText('    at file:///bot/src/bot.ts:3:1\n!!!')).toEqual({
            question: undefined,
            shortened: false
        });
    });
});
