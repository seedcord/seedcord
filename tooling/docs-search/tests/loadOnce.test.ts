import { describe, expect, it, vi } from 'vitest';

import { loadOnce } from '#src/loadOnce';

describe('loadOnce', () => {
    it('loads once and hands every later call the same result', async () => {
        const load = vi.fn((value: string) => Promise.resolve(value));
        const once = loadOnce(load);

        expect(await once('first')).toBe('first');
        expect(await once('second')).toBe('first');
        expect(load).toHaveBeenCalledOnce();
    });

    it('loads again on the next call when an earlier load never settles', async () => {
        const load = vi
            .fn<() => Promise<string>>()
            .mockReturnValueOnce(new Promise(() => undefined))
            .mockResolvedValueOnce('loaded');
        const once = loadOnce(load);

        void once();

        expect(await once()).toBe('loaded');
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
