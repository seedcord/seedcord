import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { fetchApplicationId } from '@src/applicationId';

import type { REST } from '@discordjs/rest';

// justified: the helper reads only rest.get
function restWith(get: ReturnType<typeof vi.fn>): REST {
    return { get } as unknown as REST;
}

describe('fetchApplicationId', () => {
    it('reads the id off the current-application route', async () => {
        const get = vi.fn().mockResolvedValue({ id: 'app-1' });

        await expect(fetchApplicationId(restWith(get))).resolves.toBe('app-1');
        expect(get).toHaveBeenCalledWith(Routes.currentApplication());
    });

    it('translates a REST failure into CoreApplicationUnavailable', async () => {
        const failure = new Error('401 unauthorized');

        await expect(fetchApplicationId(restWith(vi.fn().mockRejectedValue(failure)))).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.CoreApplicationUnavailable)
        );
    });

    it('keeps the original failure as the cause', async () => {
        const failure = new Error('401 unauthorized');

        await expect(fetchApplicationId(restWith(vi.fn().mockRejectedValue(failure)))).rejects.toHaveProperty(
            'cause',
            failure
        );
    });
});
