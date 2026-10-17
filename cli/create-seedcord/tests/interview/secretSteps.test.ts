import { describe, expect, it } from 'vite-plus/test';

import { tokenStep } from '#interview/steps/token';

const TOKEN = `${'a'.repeat(26)}.${'b'.repeat(6)}.${'c'.repeat(38)}`;

describe('tokenStep', () => {
    it('takes a token shaped like the three parts Discord issues', () => {
        expect(tokenStep.flag.parse(TOKEN)).toBe(TOKEN);
    });

    it('trims a token a shell or a copy paste padded', () => {
        expect(tokenStep.flag.parse(`  ${TOKEN}  `)).toBe(TOKEN);
    });

    it('rejects three parts too short to be a token, which the bot would reject at startup', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb.ccc')).toThrow();
    });

    it('rejects a value with the wrong number of parts', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb')).toThrow();
        expect(() => tokenStep.flag.parse(`${TOKEN}.ddd`)).toThrow();
    });

    it('rejects an empty part, which is what a truncated paste looks like', () => {
        expect(() => tokenStep.flag.parse('aaa..ccc')).toThrow();
    });

    it('rejects nothing at all', () => {
        expect(() => tokenStep.flag.parse('   ')).toThrow();
    });

    it('names the flag and the Bot page, since the framework error names neither', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb.ccc')).toThrow(/--token: .*Bot page/);
    });
});
