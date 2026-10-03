import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { applyFlags } from '#interview/applyFlags';

import type { AnyStep } from '#interview/types';

const token: AnyStep = {
    key: 'token',
    flag: { name: 'token', description: 'a stub', parse: (raw) => raw, noFlag: 'a stub' },
    ask: () => Promise.resolve('asked')
};

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

    it('answers null for a step whose --no- flag was passed', () => {
        expect(applyFlags([token], { 'no-token': true })).toEqual({ token: null });
    });

    it('leaves the key out when the --no- flag is false', () => {
        expect(applyFlags([token], { 'no-token': false })).toEqual({});
    });

    it('reads no --no- flag for a step that cannot wait', () => {
        expect(applyFlags([directory], { 'no-dir': true })).toEqual({});
    });

    it('rejects a value and its --no- flag together, naming both', () => {
        let thrown: unknown;
        try {
            applyFlags([token], { token: 'aaa.bbb.ccc', 'no-token': true });
        } catch (error) {
            thrown = error;
        }

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateBadUsage)).toBe(true);
        expect((thrown as Error).message).toContain('--token');
        expect((thrown as Error).message).toContain('--no-token');
    });
});
