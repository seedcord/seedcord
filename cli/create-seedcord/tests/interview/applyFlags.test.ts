import { describe, expect, it } from 'vitest';

import { applyFlags } from '#interview/applyFlags';

import type { AnyStep } from '#interview/types';

const directory: AnyStep = {
    key: 'directory',
    flag: { name: 'dir', description: 'a stub', parse: (raw) => raw },
    ask: () => Promise.resolve('asked')
};

const capabilities: AnyStep = {
    key: 'capabilities',
    flag: { name: 'capabilities', description: 'a stub', parse: (raw) => raw.split(',') },
    ask: () => Promise.resolve([])
};

describe('applyFlags', () => {
    it('parses a supplied flag into its step key', () => {
        expect(applyFlags([directory], { dir: 'my-bot' })).toEqual({ directory: 'my-bot' });
    });

    it('runs each step parser, so a list flag arrives as a list', () => {
        expect(applyFlags([capabilities], { capabilities: 'messages,reactions' })).toEqual({
            capabilities: ['messages', 'reactions']
        });
    });

    it('leaves a key out when its flag is absent', () => {
        expect(applyFlags([directory, capabilities], { dir: 'my-bot' })).toEqual({ directory: 'my-bot' });
    });

    it('ignores a flag no step declares', () => {
        expect(applyFlags([directory], { dir: 'my-bot', nonsense: 'x' })).toEqual({ directory: 'my-bot' });
    });
});
