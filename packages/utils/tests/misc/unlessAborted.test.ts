import { describe, expect, it } from 'vitest';

import { unlessAborted } from '#src/misc/unlessAborted';

describe('unlessAborted', () => {
    it('settles with the work when nothing aborts', async () => {
        await expect(unlessAborted(Promise.resolve(7), new AbortController().signal)).resolves.toBe(7);
    });

    it('rejects with the abort reason while the work is still pending', async () => {
        const controller = new AbortController();
        const pending = unlessAborted(new Promise(() => undefined), controller.signal);

        controller.abort(new Error('stopped'));

        await expect(pending).rejects.toThrow('stopped');
    });

    it('rejects at once for a signal that already aborted', async () => {
        await expect(unlessAborted(new Promise(() => undefined), AbortSignal.abort())).rejects.toMatchObject({
            name: 'AbortError'
        });
    });
});
