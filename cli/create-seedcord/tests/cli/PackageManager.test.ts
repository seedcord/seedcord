import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { PackageManager } from '#cli/PackageManager';

afterEach(() => {
    vi.unstubAllEnvs();
});

const PNPM = new PackageManager('pnpm');

describe('PackageManager.running', () => {
    it('reads the manager from the user agent', () => {
        vi.stubEnv('npm_config_user_agent', 'pnpm/11.6.0 npm/? node/v25.9.0 darwin arm64');
        expect(PackageManager.running().name).toBe('pnpm');

        vi.stubEnv('npm_config_user_agent', 'bun/1.3.0 npm/? node/v25.9.0 darwin arm64');
        expect(PackageManager.running().name).toBe('bun');
    });

    it('falls back to npm when the variable is missing', () => {
        vi.stubEnv('npm_config_user_agent', undefined);
        expect(PackageManager.running().name).toBe('npm');
    });

    it('falls back to npm for an unknown manager', () => {
        vi.stubEnv('npm_config_user_agent', 'quackpm/1.0.0 node/v25.9.0');
        expect(PackageManager.running().name).toBe('npm');
    });
});

describe('runPrefix', () => {
    it.each([
        ['npm', 'npm run'],
        ['pnpm', 'pnpm run'],
        ['yarn', 'yarn run'],
        ['bun', 'bun run']
    ] as const)('keeps run in front of the script name for %s', (name, prefix) => {
        expect(new PackageManager(name).runPrefix()).toBe(prefix);
    });
});

describe('execPrefix', () => {
    it.each([
        ['npm', 'npx'],
        ['pnpm', 'pnpm exec'],
        ['yarn', 'yarn exec'],
        ['bun', 'bun x']
    ] as const)('runs a binary from the project install for %s', (name, prefix) => {
        expect(new PackageManager(name).execPrefix()).toBe(prefix);
    });
});

describe('add', () => {
    it('uses the add verb of each manager', () => {
        expect(new PackageManager('npm').add(['discord.js'], false)).toEqual({
            command: 'npm',
            args: ['i', 'discord.js']
        });
        expect(PNPM.add(['discord.js'], false)).toEqual({ command: 'pnpm', args: ['add', 'discord.js'] });
    });

    it('passes -D for a dev dependency', () => {
        expect(PNPM.add(['typescript'], true)).toEqual({ command: 'pnpm', args: ['add', '-D', 'typescript'] });
    });

    it('keeps the packages in order', () => {
        expect(PNPM.add(['a', 'b', 'c'], false).args).toEqual(['add', 'a', 'b', 'c']);
    });
});

describe('exec', () => {
    it('spells running a local binary the way each manager does', () => {
        expect(PNPM.exec(['prettier'])).toEqual({ command: 'pnpm', args: ['exec', 'prettier'] });
        expect(new PackageManager('npm').exec(['prettier'])).toEqual({ command: 'npx', args: ['prettier'] });
        expect(new PackageManager('bun').exec(['prettier'])).toEqual({ command: 'bun', args: ['x', 'prettier'] });
    });

    it('keeps the arguments after the binary name', () => {
        expect(PNPM.exec(['prettier', '--write', '.']).args).toEqual(['exec', 'prettier', '--write', '.']);
    });
});

describe('lockfileOnly', () => {
    it.each([
        ['pnpm', '--lockfile-only'],
        ['npm', '--package-lock-only'],
        ['bun', '--lockfile-only'],
        ['yarn', '--mode=update-lockfile']
    ] as const)('adds the flag for %s', (name, flag) => {
        expect(new PackageManager(name).lockfileOnly({ command: 'x', args: ['add', 'envapt'] })).toEqual({
            command: 'x',
            args: ['add', 'envapt', flag]
        });
    });
});
