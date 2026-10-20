import { describe, expect, it } from 'vitest';

import { tokenStep } from '#interview/steps/token';
import { BOT_TOKEN, TOKEN } from '#tests/token';

describe('tokenStep', () => {
    it('takes a token shaped like the three parts Discord issues', () => {
        expect(tokenStep.flag.parse(TOKEN)).toEqual(BOT_TOKEN);
    });

    it('trims a token a shell or a copy paste padded', () => {
        expect(tokenStep.flag.parse(`  ${TOKEN}  `)).toEqual(BOT_TOKEN);
    });

    it('rejects three parts too short to be a token, which the bot would reject at startup', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb.ccc')).toThrow();
    });

    it('rejects a value with the wrong number of parts', () => {
        expect(() => tokenStep.flag.parse('aaa.bbb')).toThrow();
        expect(() => tokenStep.flag.parse(`${TOKEN}.ddd`)).toThrow();
    });

    it('rejects three parts whose first one holds no application id', () => {
        expect(() => tokenStep.flag.parse(`${'a'.repeat(26)}.${'b'.repeat(6)}.${'c'.repeat(38)}`)).toThrow();
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
