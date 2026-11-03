import { describe, expect, it } from 'vitest';

import { errorCodeQuestion, ErrorCodeReader } from '#src/ErrorCodeReader';

import { askedQuestion } from './askedQuestion';

const CODES = {
    1006: 'ConfigMissingEnv',
    3001: 'CliCancelled',
    3102: 'CliConfigNotFound',
    3116: 'CliDependencyMissing'
};
const CONFIG = { code: 3102, name: 'CliConfigNotFound' };
const DEPENDENCY = { code: 3116, name: 'CliDependencyMissing' };

function read(input: string): ReturnType<ErrorCodeReader['read']> {
    return new ErrorCodeReader(CODES).read(askedQuestion(input));
}

describe('ErrorCodeReader', () => {
    it.each([
        ['3116', 'CliDependencyMissing'],
        ['[3116]', 'CliDependencyMissing'],
        ['seedcord error 3116', 'seedcord error CliDependencyMissing'],
        ['getting ERROR CODE: 3116 in dev', 'getting ERROR CODE: CliDependencyMissing in dev'],
        ['[3116] Add seedcord to ./ as a dev dependency', 'CliDependencyMissing Add seedcord to ./ as a dev dependency']
    ])('swaps the code in %s for its name', (input, question) => {
        expect(read(input)).toEqual({ question, swapped: [DEPENDENCY], hints: [] });
    });

    it.each([
        ['what does 3102 mean', CONFIG],
        ['i got 3102.', CONFIG],
        ['port 3001 is already in use', { code: 3001, name: 'CliCancelled' }],
        ['close code 1006 from the websocket', { code: 1006, name: 'ConfigMissingEnv' }]
    ])('leaves a number that only might be a code in %s and hints at it', (input, hint) => {
        expect(read(input)).toEqual({ question: input, swapped: [], hints: [hint] });
    });

    it.each(['[9999]', 'error 9999', '9999', 'my bot has 40000 users', 'released 2026-11-03', 'at Ban.ts:3102:5'])(
        'ignores %s',
        (input) => {
            expect(read(input)).toEqual({ question: input, swapped: [], hints: [] });
        }
    );

    it('reports a code once however often it appears', () => {
        expect(read('[3116] and error 3116')).toEqual({
            question: 'CliDependencyMissing and error CliDependencyMissing',
            swapped: [DEPENDENCY],
            hints: []
        });
        expect(read('3102 or 3102').hints).toEqual([CONFIG]);
    });

    it('leaves a swapped code out of the hints when it also appears bare', () => {
        expect(read('[3116] what is 3116')).toEqual({
            question: 'CliDependencyMissing what is 3116',
            swapped: [DEPENDENCY],
            hints: []
        });
    });

    it('swaps one code and hints at another in the same question', () => {
        expect(read('[3116] on port 3001')).toEqual({
            question: 'CliDependencyMissing on port 3001',
            swapped: [DEPENDENCY],
            hints: [{ code: 3001, name: 'CliCancelled' }]
        });
    });
});

describe('errorCodeQuestion', () => {
    it('writes a question that the reader swaps for sure', () => {
        expect(read(errorCodeQuestion(CONFIG.code)).swapped).toEqual([CONFIG]);
    });
});
