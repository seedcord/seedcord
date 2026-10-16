import { describe, expect, it } from 'vitest';

import { viteMode } from '#core/viteMode';
import { withEnv } from '#tests/envapt';

describe('viteMode', () => {
    it('returns the default when ENVIRONMENT, ENV and NODE_ENV are unset', () => {
        withEnv({});

        expect(viteMode('production')).toBe('production');
        expect(viteMode('development')).toBe('development');
    });

    it.each([
        [{ ENVIRONMENT: 'staging' }, 'staging'],
        [{ ENV: 'production' }, 'production'],
        [{ NODE_ENV: 'test' }, 'test'],
        [{ ENVIRONMENT: 'Development' }, 'development']
    ])('returns the environment envapt resolves from %j', (vars, mode) => {
        withEnv(vars);

        expect(viteMode('production')).toBe(mode);
    });
});
