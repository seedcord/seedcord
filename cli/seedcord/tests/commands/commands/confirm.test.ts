import { describe, it, expect } from 'vitest';

import { confirmCount } from '#commands/commands/confirm';

import { silentLogger } from '../../silentLogger';

const logger = silentLogger;

describe('confirmCount', () => {
    it('confirms only when the typed answer equals the count', async () => {
        await expect(confirmCount(3, logger, () => Promise.resolve('3'))).resolves.toBe(true);
    });

    it('aborts when the typed count does not match', async () => {
        await expect(confirmCount(3, logger, () => Promise.resolve('2'))).resolves.toBe(false);
    });

    it('aborts on non-numeric input', async () => {
        await expect(confirmCount(3, logger, () => Promise.resolve('yes'))).resolves.toBe(false);
    });
});
