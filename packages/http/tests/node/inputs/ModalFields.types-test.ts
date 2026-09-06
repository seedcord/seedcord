import { ComponentType } from 'discord-api-types/v10';
import { expectTypeOf } from 'vitest';

import { ModalFields } from '#inputs/ModalFields';

import type { SelectedMentionables } from '#inputs/ModalFields';
import type { Collection } from '@discordjs/collection';
import type {
    APIAttachment,
    APIInteractionDataResolvedChannel,
    APIModalSubmitCheckboxComponent,
    APIModalSubmitTextInputComponent,
    APIRole,
    APIUser,
    ModalSubmitComponent
} from 'discord-api-types/v10';

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

expectTypeOf(fields.getSelectedUsers('owners', true)).toEqualTypeOf<Collection<string, APIUser>>();
expectTypeOf(fields.getSelectedUsers('owners')).toEqualTypeOf<Collection<string, APIUser> | null>();
expectTypeOf(fields.getSelectedUsers('owners', false)).toEqualTypeOf<Collection<string, APIUser> | null>();

expectTypeOf(fields.getSelectedRoles('r', true)).toEqualTypeOf<Collection<string, APIRole>>();
expectTypeOf(fields.getSelectedRoles('r')).toEqualTypeOf<Collection<string, APIRole> | null>();

expectTypeOf(fields.getSelectedChannels('c', true)).toEqualTypeOf<
    Collection<string, APIInteractionDataResolvedChannel>
>();
expectTypeOf(fields.getSelectedChannels('c')).toEqualTypeOf<Collection<
    string,
    APIInteractionDataResolvedChannel
> | null>();

expectTypeOf(fields.getUploadedFiles('f', true)).toEqualTypeOf<Collection<string, APIAttachment>>();
expectTypeOf(fields.getUploadedFiles('f')).toEqualTypeOf<Collection<string, APIAttachment> | null>();

expectTypeOf(fields.getSelectedMentionables('m', true)).toEqualTypeOf<SelectedMentionables>();
expectTypeOf(fields.getSelectedMentionables('m')).toEqualTypeOf<SelectedMentionables | null>();

expectTypeOf(fields.getRadioGroup('p', true)).toEqualTypeOf<string>();
expectTypeOf(fields.getRadioGroup('p')).toEqualTypeOf<string | null>();

expectTypeOf(fields.getSelectedMembers('owners')).toBeNullable();

expectTypeOf(fields.getField('owners')).toEqualTypeOf<ModalSubmitComponent>();
expectTypeOf(fields.getField('owners', ComponentType.TextInput)).toEqualTypeOf<APIModalSubmitTextInputComponent>();
expectTypeOf(fields.getField('owners', ComponentType.Checkbox)).toEqualTypeOf<APIModalSubmitCheckboxComponent>();
