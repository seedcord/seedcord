import { mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { ShellMode } from '#core/viteMode';

type ShellVars = Partial<Record<'ENVIRONMENT' | 'ENV' | 'NODE_ENV' | 'MODE', string>>;

// vitest sets NODE_ENV to test
function readShell(vars: ShellVars): ShellMode {
    vi.stubEnv('ENVIRONMENT', vars.ENVIRONMENT);
    vi.stubEnv('ENV', vars.ENV);
    vi.stubEnv('NODE_ENV', vars.NODE_ENV);
    vi.stubEnv('MODE', vars.MODE);
    return ShellMode.read();
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('ShellMode', () => {
    it('returns the default when the shell sets none of ENVIRONMENT, ENV, NODE_ENV and MODE', () => {
        const shell = readShell({});

        expect(shell.viteMode('production')).toBe('production');
        expect(shell.viteMode('development')).toBe('development');
    });

    it.each<ShellVars>([
        { ENVIRONMENT: 'staging' },
        { MODE: 'staging' },
        { ENVIRONMENT: 'Development' },
        { ENVIRONMENT: 'staging', ENV: 'production' },
        { ENV: 'staging', NODE_ENV: 'production' },
        { NODE_ENV: 'staging', MODE: 'production' },
        { ENVIRONMENT: 'test', MODE: 'staging' }
    ])('picks the same mode as envapt for the shell %j', async (vars) => {
        const shell = readShell(vars);
        vi.resetModules();
        const { Envapter, Environment } = await import('envapt');

        expect(shell.viteMode('production')).toBe(Environment[Envapter.environment].toLowerCase());
    });

    it("throws ConfigInvalidEnv for a name outside envapt's four", () => {
        const shell = readShell({ ENV: 'preview' });

        expect(() => shell.viteMode('production')).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.ConfigInvalidEnv,
                message: expect.stringMatching(/preview.*development, staging, production, or test/su) as string
            })
        );
    });
});

describe('ShellMode.applyMode NODE_ENV', () => {
    async function configDir(files: Record<string, string> = {}): Promise<string> {
        const dir = await mkdtempDisposable(join(tmpdir(), 'seedcord-mode-'));
        onTestFinished(() => dir.remove());
        await Promise.all(Object.entries(files).map(([name, text]) => writeFile(join(dir.path, name), text)));
        return dir.path;
    }

    beforeEach(() => {
        vi.stubEnv('NODE_ENV', undefined);
        // vite's loadEnv copies NODE_ENV from .env files into this
        vi.stubEnv('VITE_USER_NODE_ENV', undefined);
    });

    it("sets NODE_ENV to the command's default", async () => {
        new ShellMode().applyMode('production', await configDir());

        expect(process.env.NODE_ENV).toBe('production');
    });

    it('keeps the NODE_ENV the shell set', async () => {
        vi.stubEnv('NODE_ENV', 'development');

        new ShellMode().applyMode('production', await configDir());

        expect(process.env.NODE_ENV).toBe('development');
    });

    it("takes NODE_ENV=development from the mode's .env file", async () => {
        const dir = await configDir({ '.env.production': 'NODE_ENV=development\n' });

        new ShellMode().applyMode('production', dir);

        expect(process.env.NODE_ENV).toBe('development');
    });
});
