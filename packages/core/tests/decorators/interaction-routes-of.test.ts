import { describe, expect, it } from 'vitest';

import { interactionRoutesOf, InteractionRoutes, storeInteractionRoute } from '#src/internal.index';

describe('interactionRoutesOf', () => {
    it('returns every stored kind with its route strings', () => {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata carrier
        class Probe {}
        storeInteractionRoute(InteractionRoutes.Slash, ['ping', 'config/set'], Probe);
        storeInteractionRoute(InteractionRoutes.Autocomplete, 'ping', Probe);

        expect(interactionRoutesOf(Probe)).toEqual([
            [InteractionRoutes.Slash, ['ping', 'config/set']],
            [InteractionRoutes.Autocomplete, ['ping']]
        ]);
    });

    it('returns nothing for an undecorated constructor', () => {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata carrier
        class Bare {}

        expect(interactionRoutesOf(Bare)).toEqual([]);
    });
});
