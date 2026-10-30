import { describe, expect, it } from 'vite-plus/test';

import { matchChoices } from '#src/matchChoices.ts';

const choices = [
    { value: '1001', label: 'Main Hub' },
    { value: 'ABC123', label: 'Alpha' },
    { value: '1002', label: 'Test Server' }
];

describe('matchChoices', () => {
    it('keeps every choice for a blank filter', () => {
        expect(matchChoices(choices, '   ')).toEqual(choices);
    });

    it('finds a choice by its id, whatever the case', () => {
        expect(matchChoices(choices, 'abc').map(({ value }) => value)).toEqual(['ABC123']);
    });

    it('finds a label by a substring in another case', () => {
        expect(matchChoices(choices, 'SERVER').map(({ label }) => label)).toContain('Test Server');
    });

    it('leaves out a choice whose label and id both lack the filter', () => {
        expect(matchChoices(choices, 'zzz')).toEqual([]);
    });
});
