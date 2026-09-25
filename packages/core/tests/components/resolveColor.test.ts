import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { resolveColor } from '#components/resolveColor';

describe('resolveColor', () => {
    it('passes a number through unchanged', () => {
        expect(resolveColor(0x12_34_56)).toBe(0x12_34_56);
    });

    it('parses a hex string with a leading #', () => {
        expect(resolveColor('#123456')).toBe(0x12_34_56);
    });

    it('parses a hex string without a # (runtime-only, BotColor requires the #)', () => {
        // @ts-expect-error bare hex resolves at runtime for djs parity but the type requires a leading #
        expect(resolveColor('abcdef')).toBe(0xab_cd_ef);
    });

    it('resolves a named color to its integer', () => {
        expect(resolveColor('Red')).toBe(0xed_42_45);
        expect(resolveColor('Blurple')).toBe(0x58_65_f2);
    });

    it('resolves Default to 0', () => {
        expect(resolveColor('Default')).toBe(0);
    });

    it('packs an rgb tuple into a single integer', () => {
        expect(resolveColor([255, 0, 255])).toBe(0xff_00_ff);
    });

    it('resolves Random to an integer within the color range', () => {
        const color = resolveColor('Random');
        expect(Number.isSafeInteger(color)).toBe(true);
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xff_ff_ff);
    });

    it('throws on an unknown color name', () => {
        // @ts-expect-error 'Chartreuse' is not a ColorName
        expect(() => resolveColor('Chartreuse')).toThrow(SeedcordTypeError);
    });

    it('throws when a number is out of range', () => {
        expect(() => resolveColor(0x1_00_00_00)).toThrow(SeedcordRangeError);
        expect(() => resolveColor(-1)).toThrow(SeedcordRangeError);
    });
});
