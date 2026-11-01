import { describe, expect, it, vi } from 'vitest';

import { loadOnce } from '#lib/loadOnce';

describe('loadOnce', () => {
    it('loads once and hands every later call the same result', async () => {
        const load = vi.fn((value: string) => Promise.resolve(value));
        const once = loadOnce(load);

        expect(await once('first')).toBe('first');
        expect(await once('second')).toBe('first');
        expect(load).toHaveBeenCalledOnce();
    });

    it('loads again on the next call after a load fails', async () => {
        const load = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce('loaded');
        const once = loadOnce(load);

        await expect(once()).rejects.toThrow('offline');
        expect(await once()).toBe('loaded');
    });
});
