import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { InteractionsEndpoint } from '@commands/dev/tunnel/InteractionsEndpoint';

import type { EndpointRest } from '@commands/dev/tunnel/InteractionsEndpoint';

const TUNNEL = 'https://abc.trycloudflare.com';

function rest(current: string | null): { rest: EndpointRest; patch: ReturnType<typeof vi.fn> } {
    const patch = vi.fn().mockResolvedValue({});
    // justified: the endpoint reads only the get and patch surface of the rest client
    return {
        rest: {
            get: vi.fn().mockResolvedValue({ interactions_endpoint_url: current }),
            patch
        },
        patch
    };
}

describe('InteractionsEndpoint', () => {
    it('patches the application when the endpoint differs', async () => {
        const { rest: client, patch } = rest('https://stale.trycloudflare.com');

        await new InteractionsEndpoint(client).set(TUNNEL);

        expect(patch).toHaveBeenCalledExactlyOnceWith(Routes.currentApplication(), {
            body: { interactions_endpoint_url: TUNNEL }
        });
    });

    it('skips the patch when the endpoint already matches', async () => {
        const { rest: client, patch } = rest(TUNNEL);

        await new InteractionsEndpoint(client).set(TUNNEL);

        expect(patch).not.toHaveBeenCalled();
    });

    it('patches an application that has no endpoint set', async () => {
        const { rest: client, patch } = rest(null);

        await new InteractionsEndpoint(client).set(TUNNEL);

        expect(patch).toHaveBeenCalledOnce();
    });

    it('clears the endpoint with a null', async () => {
        const { rest: client, patch } = rest(TUNNEL);

        await new InteractionsEndpoint(client).clear();

        expect(patch).toHaveBeenCalledExactlyOnceWith(Routes.currentApplication(), {
            body: { interactions_endpoint_url: null }
        });
    });
});
