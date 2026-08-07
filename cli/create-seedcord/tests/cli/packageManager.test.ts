import process from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

import { addCommand, runPrefix, runningAgent } from '@cli/packageManager';

const original = process.env.npm_config_user_agent;

afterEach(() => {
    process.env.npm_config_user_agent = original;
});

describe('runningAgent', () => {
    it('reads the manager npm and friends announce', () => {
        process.env.npm_config_user_agent = 'pnpm/11.6.0 npm/? node/v25.9.0 darwin arm64';
        expect(runningAgent()).toBe('pnpm');

        process.env.npm_config_user_agent = 'bun/1.3.0 npm/? node/v25.9.0 darwin arm64';
        expect(runningAgent()).toBe('bun');
    });

    it('falls back to npm when the variable is missing', () => {
        delete process.env.npm_config_user_agent;
        expect(runningAgent()).toBe('npm');
    });

    it('falls back to npm for a manager it does not know', () => {
        process.env.npm_config_user_agent = 'quackpm/1.0.0 node/v25.9.0';
        expect(runningAgent()).toBe('npm');
    });
});

describe('runPrefix', () => {
    it('keeps run in front of the script name', () => {
        expect(runPrefix('npm')).toBe('npm run');
        expect(runPrefix('pnpm')).toBe('pnpm run');
        expect(runPrefix('yarn')).toBe('yarn run');
        expect(runPrefix('bun')).toBe('bun run');
    });
});

describe('addCommand', () => {
    it('uses the verb each manager expects', () => {
        expect(addCommand('npm', ['discord.js'], false)).toEqual({ command: 'npm', args: ['i', 'discord.js'] });
        expect(addCommand('pnpm', ['discord.js'], false)).toEqual({ command: 'pnpm', args: ['add', 'discord.js'] });
    });

    it('passes -D for a dev dependency', () => {
        expect(addCommand('pnpm', ['typescript'], true)).toEqual({
            command: 'pnpm',
            args: ['add', '-D', 'typescript']
        });
    });

    it('keeps every package in the order it was given', () => {
        expect(addCommand('pnpm', ['a', 'b', 'c'], false).args).toEqual(['add', 'a', 'b', 'c']);
    });
});
