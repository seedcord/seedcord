import { describe, expect, it } from 'vitest';

import { mergeRoles } from '#src/permissions/mergeRoles';

describe('mergeRoles', () => {
    it('adds the new ids', () => {
        expect(mergeRoles(['a'], ['b'], [])).toEqual(['a', 'b']);
    });

    it('drops the removed ids', () => {
        expect(mergeRoles(['a', 'b'], [], ['b'])).toEqual(['a']);
    });

    it('deduplicates an id already held', () => {
        expect(mergeRoles(['a'], ['a'], [])).toEqual(['a']);
    });

    it('lets remove win over add for the same id', () => {
        expect(mergeRoles(['a'], ['b'], ['b'])).toEqual(['a']);
    });

    it('ignores a removal the member does not hold', () => {
        expect(mergeRoles(['a'], [], ['z'])).toEqual(['a']);
    });

    it('returns the current ids when both arguments are empty', () => {
        expect(mergeRoles(['a', 'b'], [], [])).toEqual(['a', 'b']);
    });
});
