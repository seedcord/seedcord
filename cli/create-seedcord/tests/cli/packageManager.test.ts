import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { addCommand, execCommand, runPrefix, runningAgent } from '@cli/packageManager';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('runningAgent', () => {
    it('reads the manager npm and friends announce', () => {
        vi.stubEnv('npm_config_user_agent', 'pnpm/11.6.0 npm/? node/v25.9.0 darwin arm64');
        expect(runningAgent()).toBe('pnpm');

        vi.stubEnv('npm_config_user_agent', 'bun/1.3.0 npm/? node/v25.9.0 darwin arm64');
        expect(runningAgent()).toBe('bun');
    });

    it('falls back to npm when the variable is missing', () => {
        vi.stubEnv('npm_config_user_agent', undefined);
        expect(runningAgent()).toBe('npm');
    });

    it('falls back to npm for a manager it does not know', () => {
        vi.stubEnv('npm_config_user_agent', 'quackpm/1.0.0 node/v25.9.0');
        expect(runningAgent()).toBe('npm');
    });

    it('leaves the environment as it found it', () => {
        const before = process.env.npm_config_user_agent;
        vi.stubEnv('npm_config_user_agent', 'quackpm/1.0.0');
        vi.unstubAllEnvs();

        expect(process.env.npm_config_user_agent).toBe(before);
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

describe('execCommand', () => {
    it('spells running a local binary the way each manager does', () => {
        expect(execCommand('pnpm', ['prettier'])).toEqual({ command: 'pnpm', args: ['exec', 'prettier'] });
        expect(execCommand('npm', ['prettier'])).toEqual({ command: 'npx', args: ['prettier'] });
        expect(execCommand('bun', ['prettier'])).toEqual({ command: 'bun', args: ['x', 'prettier'] });
    });

    it('keeps the arguments after the binary name', () => {
        expect(execCommand('pnpm', ['prettier', '--write', '.']).args).toEqual(['exec', 'prettier', '--write', '.']);
    });
});
