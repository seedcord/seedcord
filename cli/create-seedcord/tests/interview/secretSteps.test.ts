import { describe, expect, it } from 'vitest';

import { publicKeyStep } from '@interview/steps/publicKey';
import { tokenStep } from '@interview/steps/token';

const KEY = 'a'.repeat(64);

describe('tokenStep', () => {
    it('takes a token shaped like the three parts Discord issues', () => {
        const token = `${'a'.repeat(26)}.${'b'.repeat(6)}.${'c'.repeat(38)}`;
        expect(tokenStep.flag.parse(token)).toBe(token);
    });

    it('trims a token a shell or a copy paste padded', () => {
        expect(tokenStep.flag.parse('  aaa.bbb.ccc  ')).toBe('aaa.bbb.ccc');
    });

    it('rejects a value with the wrong number of parts', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb')).toThrow();
        expect(() => tokenStep.flag.parse('aaa.bbb.ccc.ddd')).toThrow();
    });

    it('rejects an empty part, which is what a truncated paste looks like', () => {
        expect(() => tokenStep.flag.parse('aaa..ccc')).toThrow();
    });

    it('rejects nothing at all', () => {
        expect(() => tokenStep.flag.parse('   ')).toThrow();
    });
});

describe('publicKeyStep', () => {
    it('takes the sixty-four hex characters of an Ed25519 key', () => {
        expect(publicKeyStep.flag.parse(KEY)).toBe(KEY);
    });

    it('lowercases so two spellings of one key agree', () => {
        expect(publicKeyStep.flag.parse('A'.repeat(64))).toBe(KEY);
    });

    it('rejects a key of the wrong length', () => {
        expect(() => publicKeyStep.flag.parse('a'.repeat(63))).toThrow();
        expect(() => publicKeyStep.flag.parse('a'.repeat(65))).toThrow();
    });

    it('rejects a key with a character outside hex', () => {
        expect(() => publicKeyStep.flag.parse(`${'a'.repeat(63)}z`)).toThrow();
    });

    it('skips itself on gateway, which needs no public key', () => {
        expect(publicKeyStep.skip?.({ transport: 'gateway' })).toBe(true);
        expect(publicKeyStep.skip?.({ transport: 'http' })).toBe(false);
    });
});
