import { describe, expect, it } from 'vite-plus/test';

import { DispatchContext } from '#src/dispatch/DispatchContext';
import { InteractionKind } from '#src/metadataKeys';
import { interactionFaultSource } from '#subscribers/interactionFaultSource';

const fields = { customId: null, userId: 'u1', guildId: null, channelId: null, interactionId: 'i1', raw: {} };

describe('interactionFaultSource', () => {
    it('puts a command dispatch route in command', () => {
        const source = interactionFaultSource(new DispatchContext(InteractionKind.UserContextMenu, 'Report'), fields);
        expect(source).toMatchObject({ kind: 'interaction', interactionKind: 'context-menu', command: 'Report' });
    });

    it('leaves command empty on a component and keeps its custom id', () => {
        const source = interactionFaultSource(new DispatchContext(InteractionKind.RoleMenu, 'pick'), {
            ...fields,
            customId: 'pick:abc'
        });
        expect(source).toMatchObject({ interactionKind: 'select', command: null, customId: 'pick:abc' });
    });

    it('returns null for an autocomplete dispatch', () => {
        expect(interactionFaultSource(new DispatchContext(InteractionKind.Autocomplete, 'search'), fields)).toBeNull();
    });
});
