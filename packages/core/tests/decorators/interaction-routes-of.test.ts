import { describe, expect, it } from 'vitest';

import { interactionRoutesOf, storeInteractionRoute } from '#src/internal.index';
import { InteractionKind } from '#src/metadataKeys';

describe('interactionRoutesOf', () => {
    it('returns every stored kind with its route strings', () => {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata carrier
        class Probe {}
        storeInteractionRoute(InteractionKind.Slash, ['ping', 'config/set'], Probe);
        storeInteractionRoute(InteractionKind.Autocomplete, 'ping', Probe);

        expect(interactionRoutesOf(Probe)).toEqual([
            [InteractionKind.Slash, ['ping', 'config/set']],
            [InteractionKind.Autocomplete, ['ping']]
        ]);
    });

    it('returns nothing for an undecorated constructor', () => {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata carrier
        class Bare {}

        expect(interactionRoutesOf(Bare)).toEqual([]);
    });
});
