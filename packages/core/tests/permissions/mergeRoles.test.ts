import { describe, expect, it } from 'vite-plus/test';

import { mergeRoles } from '#src/permissions/mergeRoles';

describe('mergeRoles', () => {
    it('adds the new ids', () => {
        expect(mergeRoles(['a'], ['b'], [])).toEqual(['a', 'b']);
    });

    it("doesn't return the removed ids", () => {
        expect(mergeRoles(['a', 'b'], [], ['b'])).toEqual(['a']);
    });

    it('deduplicates an id already held', () => {
        expect(mergeRoles(['a'], ['a'], [])).toEqual(['a']);
    });

    it('removes an id that is in both lists', () => {
        expect(mergeRoles(['a'], ['b'], ['b'])).toEqual(['a']);
    });

    it('ignores a removal the member does not hold', () => {
        expect(mergeRoles(['a'], [], ['z'])).toEqual(['a']);
    });

    it('returns the current ids when both arguments are empty', () => {
        expect(mergeRoles(['a', 'b'], [], [])).toEqual(['a', 'b']);
    });
});
