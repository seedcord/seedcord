import { describe, expect, it, vi } from 'vitest';

import { AutocompleteResponder } from '#reply/AutocompleteResponder';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { busWith } from '#tests/utils/busWith';

function responderWith(post: (choices: readonly string[]) => Promise<unknown>): AutocompleteResponder<string> {
    const telemetry = { bus: busWith(), dispatch: new DispatchContext('autocomplete', 'search'), interactionId: 'i1' };
    return new AutocompleteResponder(telemetry, post);
}

describe('AutocompleteResponder', () => {
    it('does not clear after a respond that the handler did not await', async () => {
        const post = vi.fn().mockResolvedValue(undefined);
        const responder = responderWith(post);

        const pending = responder.respond(['a']);
        await responder.clear();
        await pending;

        expect(post).toHaveBeenCalledOnce();
    });

    it('clears after a respond that failed', async () => {
        const post = vi.fn().mockRejectedValueOnce(new Error('bad choices')).mockResolvedValue(undefined);
        const responder = responderWith(post);

        await expect(responder.respond(['a'])).rejects.toThrow('bad choices');
        await responder.clear();

        expect(post).toHaveBeenLastCalledWith([]);
    });

    it('clears after an unawaited respond that fails', async () => {
        const post = vi.fn().mockRejectedValueOnce(new Error('bad choices')).mockResolvedValue(undefined);
        const responder = responderWith(post);

        const pending = responder.respond(['a']);
        await responder.clear();

        await expect(pending).rejects.toThrow('bad choices');
        expect(post).toHaveBeenLastCalledWith([]);
    });
});
