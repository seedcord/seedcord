import { describe, expect, it } from 'vitest';

import { botColorStep, COLOR_NAMES } from '#interview/steps/botColor';
import { capabilitiesStep } from '#interview/steps/capabilities';

describe('capabilitiesStep', () => {
    it('splits a comma list into ids', () => {
        expect(capabilitiesStep.flag.parse('reactions,voice')).toEqual(['reactions', 'voice']);
    });

    it('tolerates spaces around each id', () => {
        expect(capabilitiesStep.flag.parse(' reactions , voice ')).toEqual(['reactions', 'voice']);
    });

    it('reads an empty flag as no capabilities', () => {
        expect(capabilitiesStep.flag.parse('')).toEqual([]);
    });

    it('names the offender when an id matches no capability', () => {
        expect(() => capabilitiesStep.flag.parse('reactions,telepathy')).toThrow(/telepathy/);
    });

    it('skips itself on http, which has no intents', () => {
        expect(capabilitiesStep.skip?.({ transport: 'http' })).toBe(true);
        expect(capabilitiesStep.skip?.({ transport: 'gateway' })).toBe(false);
    });
});

describe('botColorStep', () => {
    // a duplicate entry compiles and doubles an option in the picker
    it('lists each color name once', () => {
        expect(new Set(COLOR_NAMES).size).toBe(COLOR_NAMES.length);
    });

    it('takes a name as written', () => {
        expect(botColorStep.flag.parse('Blurple')).toBe('Blurple');
    });

    it('matches a name whatever case it arrives in', () => {
        expect(botColorStep.flag.parse('blurple')).toBe('Blurple');
        expect(botColorStep.flag.parse('DARKAQUA')).toBe('DarkAqua');
    });

    it('names the offender when the color is unknown', () => {
        expect(() => botColorStep.flag.parse('burple')).toThrow(/burple/);
    });

    it('takes a hex with or without the hash', () => {
        expect(botColorStep.flag.parse('#fe565a')).toBe('#fe565a');
        expect(botColorStep.flag.parse('fe565a')).toBe('#fe565a');
    });

    it('lowercases a hex so two spellings of one color agree', () => {
        expect(botColorStep.flag.parse('#FE565A')).toBe('#fe565a');
    });

    it('rejects a hex that is not six digits, which is what resolveColor accepts', () => {
        expect(() => botColorStep.flag.parse('#fff')).toThrow();
        expect(() => botColorStep.flag.parse('#fe565aa')).toThrow();
        expect(() => botColorStep.flag.parse('#gggggg')).toThrow();
    });
});
