import { describe, expect, it, vi } from 'vitest';

import { emptyManifest, readyEngine, signedRequest, slashPayload } from './harness';

import type { RouteManifest } from '@src/manifest/RouteManifest';

// a poisoned engine chunk stands in for deploy skew, the dynamic import itself rejects
vi.mock('@src/dispatch/dispatchInteraction', () => {
    throw new Error('chunk missing');
});

describe('engine chunk failure', () => {
    it('still acks 202 when the dispatch module fails to load', async () => {
        class Ghost {
            execute(): void {}
        }
        const manifest: RouteManifest = {
            ...emptyManifest(),
            commands: [{ name: 'ghost', type: 1, load: () => Promise.resolve({ Ghost }) }]
        };
        const { signer, handle } = await readyEngine(manifest);

        const response = await handle(await signedRequest(signer, slashPayload('ghost')));

        expect(response.status).toBe(202);
    });
});
