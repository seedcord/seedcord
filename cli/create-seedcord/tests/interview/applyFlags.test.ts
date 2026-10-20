import { describe, expect, it } from 'vitest';

import { applyFlags } from '#interview/applyFlags';
import { BOT_TOKEN } from '#tests/token';

import type { Step } from '#interview/types';

const token: Step<'token'> = {
    key: 'token',
    label: 'token',
    flag: { name: 'token', description: 'a stub', parse: () => BOT_TOKEN, noFlag: 'a stub' },
    ask: () => Promise.resolve(BOT_TOKEN),
    shown: String
};

const directory: Step<'directory'> = {
    key: 'directory',
    label: 'folder',
    flag: { name: 'dir', description: 'a stub', parse: (raw) => raw },
    ask: () => Promise.resolve('asked'),
    shown: String
};

const capabilities: Step<'capabilities'> = {
    key: 'capabilities',
    label: 'events',
    flag: { name: 'capabilities', description: 'a stub', parse: (raw) => raw.split(',') },
    ask: () => Promise.resolve([]),
    shown: String
};

const install: Step<'install'> = {
    key: 'install',
    label: 'install',
    flag: { name: 'install', description: 'a stub', noFlag: 'a stub' },
    ask: () => Promise.resolve(true),
    shown: String
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

    it('answers a yes or no step true from its switch and false from its --no- switch', () => {
        expect(applyFlags([install], { install: true })).toEqual({ install: true });
        expect(applyFlags([install], { 'no-install': true })).toEqual({ install: false });
    });

    it('leaves the key out when the --no- flag is false', () => {
        expect(applyFlags([token], { 'no-token': false })).toEqual({});
    });

    it('reads no --no- flag for a step that cannot wait', () => {
        expect(applyFlags([directory], { 'no-dir': true })).toEqual({});
    });
});
