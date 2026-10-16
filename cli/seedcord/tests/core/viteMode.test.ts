import { describe, expect, it } from 'vitest';

import { viteMode } from '#core/viteMode';
import { withEnv, withShellEnv } from '#tests/envapt';

describe('viteMode', () => {
    it('returns the default when the shell sets none of ENVIRONMENT, ENV and NODE_ENV', () => {
        withShellEnv({});

        expect(viteMode('production')).toBe('production');
        expect(viteMode('development')).toBe('development');
    });

    it('returns the default when only a .env file sets ENV', () => {
        withEnv({ ENV: 'development' });
        withShellEnv({});

        expect(viteMode('production')).toBe('production');
    });

    it.each([
        [{ ENVIRONMENT: 'staging' }, 'staging'],
        [{ ENV: 'production' }, 'production'],
        [{ NODE_ENV: 'test' }, 'test'],
        [{ ENVIRONMENT: 'Development' }, 'development'],
        [{ ENVIRONMENT: 'preview' }, 'development']
    ])('returns the environment envapt resolves from the shell %j', (vars, mode) => {
        withShellEnv(vars);

        expect(viteMode('production')).toBe(mode);
    });
});
