import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    addCommand,
    execCommand,
    execPrefix,
    lockfileOnly,
    runPrefix,
    runningAgent,
    supportsLockfileOnly
} from '#cli/packageManager';

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
});

describe('runPrefix', () => {
    it('keeps run in front of the script name', () => {
        expect(runPrefix('npm')).toBe('npm run');
        expect(runPrefix('pnpm')).toBe('pnpm run');
        expect(runPrefix('yarn')).toBe('yarn run');
        expect(runPrefix('bun')).toBe('bun run');
    });
});

describe('execPrefix', () => {
    it('runs a binary from the project install', () => {
        expect(execPrefix('npm')).toBe('npx');
        expect(execPrefix('pnpm')).toBe('pnpm exec');
        expect(execPrefix('yarn')).toBe('yarn exec');
        expect(execPrefix('bun')).toBe('bun x');
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

describe('lockfileOnly', () => {
    it.each([
        ['pnpm', ['add', 'discord.js', '--lockfile-only']],
        ['npm', ['i', 'discord.js', '--package-lock-only']],
        ['bun', ['add', 'discord.js', '--lockfile-only']]
    ] as const)('tells %s to write only the lockfile', (agent, args) => {
        expect(supportsLockfileOnly(agent)).toBe(true);
        expect(lockfileOnly(agent, addCommand(agent, ['discord.js'], false))?.args).toEqual(args);
    });

    it('uses the berry flag on yarn 2 and up', () => {
        vi.stubEnv('npm_config_user_agent', 'yarn/4.18.1 npm/? node/v25.9.0 darwin arm64');

        expect(supportsLockfileOnly('yarn')).toBe(true);
        expect(lockfileOnly('yarn', addCommand('yarn', ['discord.js'], false))?.args).toEqual([
            'add',
            'discord.js',
            '--mode=update-lockfile'
        ]);
    });

    it('has no lockfile-only add for yarn classic', () => {
        vi.stubEnv('npm_config_user_agent', 'yarn/1.22.22 npm/? node/v25.9.0 darwin arm64');

        expect(supportsLockfileOnly('yarn')).toBe(false);
        expect(lockfileOnly('yarn', addCommand('yarn', ['discord.js'], false))).toBeNull();
    });
});
