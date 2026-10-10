import { describe, expect, it } from 'vitest';

import { directoryStep } from '#interview/steps/directory';
import { transportStep } from '#interview/steps/transport';

describe('directoryStep', () => {
    it('takes the directory from its flag verbatim', () => {
        expect(directoryStep.flag.parse('my-bot')).toBe('my-bot');
    });

    it('trims surrounding whitespace a shell quoted in', () => {
        expect(directoryStep.flag.parse('  my-bot  ')).toBe('my-bot');
    });

    it('rejects an empty directory', () => {
        expect(() => directoryStep.flag.parse('   ')).toThrow();
    });

    it('keeps a nested path, checking only the folder the project goes in', () => {
        expect(directoryStep.flag.parse('bots/my-bot')).toBe('bots/my-bot');
    });

    it('rejects a name npm would refuse as a package name', () => {
        expect(() => directoryStep.flag.parse('My Bot')).toThrow();
        expect(() => directoryStep.flag.parse('MyBot')).toThrow();
        expect(() => directoryStep.flag.parse('_bot')).toThrow();
        expect(() => directoryStep.flag.parse('bots/My Bot')).toThrow();
    });

    it('takes the punctuation npm allows', () => {
        expect(directoryStep.flag.parse('my-bot_2.0')).toBe('my-bot_2.0');
    });

    it('takes a name right on the length limit', () => {
        const longest = 'a'.repeat(64);
        expect(directoryStep.flag.parse(longest)).toBe(longest);
    });

    it('rejects one character past it, and says the number', () => {
        expect(() => directoryStep.flag.parse('a'.repeat(65))).toThrow(/64/);
    });

    it('measures the folder, leaving the path in front of it out', () => {
        expect(directoryStep.flag.parse(`${'nested/'.repeat(20)}my-bot`)).toContain('my-bot');
    });
});

describe('transportStep', () => {
    it('accepts both transports', () => {
        expect(transportStep.flag.parse('gateway')).toBe('gateway');
        expect(transportStep.flag.parse('http')).toBe('http');
    });

    it('is case-insensitive', () => {
        expect(transportStep.flag.parse('Gateway')).toBe('gateway');
    });

    it('names both options when the value is neither', () => {
        expect(() => transportStep.flag.parse('websocket')).toThrow(/http.*gateway/);
    });
});
