import { cn, tw } from '@seedcord/ui';
import { describe, expect, it } from 'vitest';

describe('tw', () => {
    it('drops null, undefined, false, and empty-string interpolations', () => {
        const result = tw`px-2 ${null} ${undefined} ${false} ${''} py-1`;
        expect(result).toBe('px-2 py-1');
    });

    it('keeps truthy string interpolations', () => {
        const variant = 'text-red-500';
        const result = tw`px-2 ${variant} py-1`;
        expect(result).toBe('px-2 text-red-500 py-1');
    });

    it('flattens nested arrays of class tokens', () => {
        const result = tw`base ${['flex', ['items-center', ['justify-between']]]} end`;
        expect(result).toBe('base flex items-center justify-between end');
    });

    it('handles mixed inputs of strings, arrays, and falsy values', () => {
        const flags: { active: boolean; disabled: boolean } = { active: true, disabled: false };
        const result = tw`btn ${flags.active && 'is-active'} ${flags.disabled && 'is-disabled'} ${['rounded', null, 'shadow']}`;
        expect(result).toBe('btn is-active rounded shadow');
    });

    it('runs the result through tailwind-merge to dedupe conflicts', () => {
        const result = tw`px-2 ${'px-4'}`;
        expect(result).toBe('px-4');
    });
});

describe('cn', () => {
    it('filters out null, undefined, false, and empty-string values', () => {
        const result = cn('px-2', null, undefined, false, '', 'py-1');
        expect(result).toBe('px-2 py-1');
    });

    it('dedupes conflicting tailwind utilities via tailwind-merge', () => {
        expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('short-circuits boolean expressions for conditional classes', () => {
        const flags: { active: boolean; primary: boolean } = { active: false, primary: true };
        const result = cn('base', flags.active && 'is-active', flags.primary && 'is-primary');
        expect(result).toBe('base is-primary');
    });

    it('flattens nested arrays of class values', () => {
        const result = cn('a', ['b', ['c', null, 'd']], 'e');
        expect(result).toBe('a b c d e');
    });

    it('merges object-form class maps with truthy values only', () => {
        const result = cn('base', { 'is-on': true, 'is-off': false });
        expect(result).toBe('base is-on');
    });
});
