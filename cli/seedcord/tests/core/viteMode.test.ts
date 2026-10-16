import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

    it.each([
        [{ ENVIRONMENT: 'staging' }, 'staging'],
        [{ ENV: 'production' }, 'production'],
        [{ NODE_ENV: 'test' }, 'test'],
        [{ MODE: 'staging' }, 'staging'],
        [{ ENVIRONMENT: 'Development' }, 'development'],
        [{ ENV: 'staging', MODE: 'production' }, 'staging']
    ])('reads the mode from the shell %j in the order envapt does', (vars, mode) => {
        expect(readShell(vars).viteMode('production')).toBe(mode);
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
