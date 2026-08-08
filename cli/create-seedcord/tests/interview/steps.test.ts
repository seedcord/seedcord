import { describe, expect, it } from 'vitest';

import { directoryStep } from '@interview/steps/directory';
import { JAVASCRIPT_REPLIES, languageStep, pickReply } from '@interview/steps/language';
import { transportStep } from '@interview/steps/transport';

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

describe('languageStep', () => {
    it('answers TypeScript whatever the flag says', () => {
        expect(languageStep.flag.parse('javascript')).toBe('typescript');
        expect(languageStep.flag.parse('typescript')).toBe('typescript');
        expect(languageStep.flag.parse('rust')).toBe('typescript');
    });
});

describe('the JavaScript replies', () => {
    it('offers a pool with no repeats', () => {
        expect(JAVASCRIPT_REPLIES.length).toBeGreaterThan(1);
        expect(new Set(JAVASCRIPT_REPLIES).size).toBe(JAVASCRIPT_REPLIES.length);
    });

    // clack leaves JavaScript on screen as the picked label
    it('names TypeScript in every line', () => {
        expect(JAVASCRIPT_REPLIES.filter((reply) => !reply.includes('TypeScript'))).toEqual([]);
    });

    it('opens each line differently', () => {
        const openers = JAVASCRIPT_REPLIES.map((reply) => reply.split(' ')[0]?.replace(/\W+$/, ''));

        expect(new Set(openers).size).toBe(openers.length);
    });

    it('picks one from the pool', () => {
        expect(JAVASCRIPT_REPLIES).toContain(pickReply(() => 0));
        expect(pickReply(() => 0)).toBe(JAVASCRIPT_REPLIES[0]);
    });

    it('reaches the last line at the top of the random range', () => {
        expect(pickReply(() => 0.999999)).toBe(JAVASCRIPT_REPLIES.at(-1));
    });
});
