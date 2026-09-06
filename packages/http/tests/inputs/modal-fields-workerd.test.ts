import { Collection } from '@discordjs/collection';
import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ModalFields } from '#inputs/ModalFields';

import type { APIUser } from 'discord-api-types/v10';

const ada: APIUser = { id: 'u1', username: 'ada', discriminator: '0', global_name: 'ada', avatar: null };

// the pool's cjs interop can resolve discord-api-types enums to undefined at import time
describe('modal fields on workerd', () => {
    const fields = new ModalFields({
        custom_id: 'form',
        resolved: { users: { u1: ada } },
        components: [
            {
                type: ComponentType.Label,
                id: 1,
                component: { type: ComponentType.TextInput, id: 2, custom_id: 'name', value: 'seedcord' }
            },
            {
                type: ComponentType.Label,
                id: 3,
                component: { type: ComponentType.UserSelect, id: 4, custom_id: 'owners', values: ['u1'] }
            }
        ]
    });

    it('reads a text input', () => {
        expect(fields.getTextInputValue('name')).toBe('seedcord');
    });

    it('resolves a user select against the payload', () => {
        expect(fields.getSelectedUsers('owners')).toEqual(new Collection([['u1', ada]]));
    });
});
