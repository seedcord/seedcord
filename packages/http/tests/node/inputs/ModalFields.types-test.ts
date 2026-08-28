import { ComponentType } from 'discord-api-types/v10';
import { expectTypeOf } from 'vitest';

import { ModalFields } from '#inputs/ModalFields';

import type { SelectedMentionables } from '#inputs/ModalFields';
import type { APIAttachment, APIInteractionDataResolvedChannel, APIRole, APIUser } from 'discord-api-types/v10';

const fields = new ModalFields({
    custom_id: 'form',
    components: [
        {
            type: ComponentType.Label,
            id: 1,
            component: { type: ComponentType.UserSelect, id: 2, custom_id: 'owners', values: [] }
        }
    ]
});

expectTypeOf(fields.getSelectedUsers('owners', true)).toEqualTypeOf<Map<string, APIUser>>();
expectTypeOf(fields.getSelectedUsers('owners')).toEqualTypeOf<Map<string, APIUser> | null>();
expectTypeOf(fields.getSelectedUsers('owners', false)).toEqualTypeOf<Map<string, APIUser> | null>();

expectTypeOf(fields.getSelectedRoles('r', true)).toEqualTypeOf<Map<string, APIRole>>();
expectTypeOf(fields.getSelectedRoles('r')).toEqualTypeOf<Map<string, APIRole> | null>();

expectTypeOf(fields.getSelectedChannels('c', true)).toEqualTypeOf<Map<string, APIInteractionDataResolvedChannel>>();
expectTypeOf(fields.getSelectedChannels('c')).toEqualTypeOf<Map<string, APIInteractionDataResolvedChannel> | null>();

expectTypeOf(fields.getUploadedFiles('f', true)).toEqualTypeOf<Map<string, APIAttachment>>();
expectTypeOf(fields.getUploadedFiles('f')).toEqualTypeOf<Map<string, APIAttachment> | null>();

expectTypeOf(fields.getSelectedMentionables('m', true)).toEqualTypeOf<SelectedMentionables>();
expectTypeOf(fields.getSelectedMentionables('m')).toEqualTypeOf<SelectedMentionables | null>();

expectTypeOf(fields.getRadioGroup('p', true)).toEqualTypeOf<string>();
expectTypeOf(fields.getRadioGroup('p')).toEqualTypeOf<string | null>();

expectTypeOf(fields.getSelectedMembers('owners')).toBeNullable();
