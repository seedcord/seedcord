import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ChannelType, ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ModalFields } from '#inputs/ModalFields';

import type {
    APIAttachment,
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIModalSubmission,
    APIModalSubmissionComponent,
    APIRole,
    APIUser,
    ModalSubmitComponent
} from 'discord-api-types/v10';

function submission(components: APIModalSubmissionComponent[]): APIModalSubmission {
    return { custom_id: 'form', components };
}

function labelled(id: number, component: ModalSubmitComponent): APIModalSubmissionComponent {
    return { type: ComponentType.Label, id, component };
}

function user(id: string, username: string): APIUser {
    return { id, username, discriminator: '0', global_name: username, avatar: null };
}

// justified: each fixture carries only the fields the assertions read
function member(nick: string): APIInteractionDataResolvedGuildMember {
    return { nick, roles: [], permissions: '0' } as unknown as APIInteractionDataResolvedGuildMember;
}

function role(id: string, name: string): APIRole {
    return { id, name } as unknown as APIRole;
}

function channel(id: string, type: ChannelType): APIInteractionDataResolvedChannel {
    return { id, name: id, type, permissions: '0' };
}

function attachment(id: string, filename: string): APIAttachment {
    return { id, filename } as unknown as APIAttachment;
}

function codeFrom(fn: () => unknown): SeedcordErrorCode {
    try {
        fn();
    } catch (error) {
        if (isSeedcordError(error)) return error.code;
        throw error;
    }
    throw new Error('expected a throw');
}

describe('text inputs', () => {
    const fields = new ModalFields(
        submission([
            {
                type: ComponentType.ActionRow,
                id: 1,
                components: [{ type: ComponentType.TextInput, id: 2, custom_id: 'name', value: 'dhruv' }]
            },
            {
                type: ComponentType.Label,
                id: 3,
                component: { type: ComponentType.TextInput, id: 4, custom_id: 'bio', value: 'writes bots' }
            }
        ])
    );

    it('reads a value out of an action row', () => {
        expect(fields.getTextInputValue('name')).toBe('dhruv');
    });

    it('reads a value out of a label', () => {
        expect(fields.getTextInputValue('bio')).toBe('writes bots');
    });

    it('throws when the modal carries no field with that custom id', () => {
        expect(codeFrom(() => fields.getTextInputValue('nope'))).toBe(SeedcordErrorCode.ModalFieldNotFound);
    });
});

describe('kind mismatch', () => {
    const fields = new ModalFields(
        submission([
            {
                type: ComponentType.Label,
                id: 1,
                component: { type: ComponentType.Checkbox, id: 2, custom_id: 'agree', value: true }
            }
        ])
    );

    it('throws when the field holds another kind', () => {
        expect(codeFrom(() => fields.getTextInputValue('agree'))).toBe(SeedcordErrorCode.ModalFieldWrongKind);
    });

    it('names the getter reading the kind the field holds', () => {
        let message = '';
        try {
            fields.getTextInputValue('agree');
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toContain('getCheckbox');
    });
});

describe('string select', () => {
    const fields = new ModalFields(
        submission([
            {
                type: ComponentType.Label,
                id: 1,
                component: {
                    type: ComponentType.StringSelect,
                    id: 2,
                    custom_id: 'colors',
                    values: ['red', 'blue']
                }
            }
        ])
    );

    it('returns every picked value', () => {
        expect(fields.getStringSelectValues('colors')).toEqual(['red', 'blue']);
    });

    it('returns an empty list when nothing was picked', () => {
        const empty = new ModalFields(
            submission([
                {
                    type: ComponentType.Label,
                    id: 1,
                    component: { type: ComponentType.StringSelect, id: 2, custom_id: 'colors', values: [] }
                }
            ])
        );
        expect(empty.getStringSelectValues('colors')).toEqual([]);
    });
});

describe('user select', () => {
    const ada = user('u1', 'ada');
    const grace = user('u2', 'grace');
    const linus = user('u3', 'linus');

    const fields = new ModalFields({
        custom_id: 'form',
        resolved: { users: { u1: ada, u2: grace, u3: linus } },
        components: [
            labelled(1, { type: ComponentType.UserSelect, id: 2, custom_id: 'owners', values: ['u1', 'u3'] }),
            labelled(3, { type: ComponentType.UserSelect, id: 4, custom_id: 'reviewers', values: ['u2'] })
        ]
    });

    it('resolves the ids the field picked', () => {
        expect(fields.getSelectedUsers('owners')).toEqual(
            new Map([
                ['u1', ada],
                ['u3', linus]
            ])
        );
    });

    it('keeps two fields in one modal apart', () => {
        expect(fields.getSelectedUsers('reviewers')).toEqual(new Map([['u2', grace]]));
    });
});

describe('an empty pick beside a filled one', () => {
    const ada = user('u1', 'ada');
    const fields = new ModalFields({
        custom_id: 'form',
        resolved: { users: { u1: ada } },
        components: [
            labelled(1, { type: ComponentType.UserSelect, id: 2, custom_id: 'owners', values: ['u1'] }),
            labelled(3, { type: ComponentType.UserSelect, id: 4, custom_id: 'reviewers', values: [] })
        ]
    });

    it('returns null', () => {
        expect(fields.getSelectedUsers('reviewers')).toBeNull();
    });

    it('throws when the read asked for a selection', () => {
        expect(codeFrom(() => fields.getSelectedUsers('reviewers', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });
});

describe('mentionable select', () => {
    const ada = user('u1', 'ada');
    const boss = member('boss');
    const mods = role('r1', 'mods');

    const fields = new ModalFields({
        custom_id: 'form',
        resolved: { users: { u1: ada }, members: { u1: boss }, roles: { r1: mods } },
        components: [
            labelled(1, {
                type: ComponentType.MentionableSelect,
                id: 2,
                custom_id: 'targets',
                values: ['u1', 'r1']
            })
        ]
    });

    it('splits one field into its users, members, and roles', () => {
        expect(fields.getSelectedUsers('targets')).toEqual(new Map([['u1', ada]]));
        expect(fields.getSelectedMembers('targets')).toEqual(new Map([['u1', boss]]));
        expect(fields.getSelectedRoles('targets')).toEqual(new Map([['r1', mods]]));
    });

    it('groups the picks into users, members, and roles', () => {
        expect(fields.getSelectedMentionables('targets')).toEqual({
            users: new Map([['u1', ada]]),
            members: new Map([['u1', boss]]),
            roles: new Map([['r1', mods]])
        });
    });

    it('returns null for a bucket the payload left out', () => {
        const rolesOnly = new ModalFields({
            custom_id: 'form',
            resolved: { roles: { r1: mods } },
            components: [
                labelled(1, {
                    type: ComponentType.MentionableSelect,
                    id: 2,
                    custom_id: 'targets',
                    values: ['r1']
                })
            ]
        });
        expect(rolesOnly.getSelectedMembers('targets')).toBeNull();
    });

    it('throws when a required role read finds nothing', () => {
        const empty = new ModalFields({
            custom_id: 'form',
            components: [labelled(1, { type: ComponentType.RoleSelect, id: 2, custom_id: 'ping', values: [] })]
        });
        expect(codeFrom(() => empty.getSelectedRoles('ping', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });

    it('returns null for a mentionable field that picked nothing', () => {
        const empty = new ModalFields({
            custom_id: 'form',
            components: [
                labelled(1, { type: ComponentType.MentionableSelect, id: 2, custom_id: 'targets', values: [] })
            ]
        });
        expect(empty.getSelectedMentionables('targets')).toBeNull();
        expect(codeFrom(() => empty.getSelectedMentionables('targets', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });
});

describe('channel select', () => {
    const general = channel('c1', ChannelType.GuildText);
    const lounge = channel('c2', ChannelType.GuildVoice);

    const fields = new ModalFields({
        custom_id: 'form',
        resolved: { channels: { c1: general, c2: lounge } },
        components: [
            labelled(1, { type: ComponentType.ChannelSelect, id: 2, custom_id: 'where', values: ['c1', 'c2'] })
        ]
    });

    it('resolves every picked channel', () => {
        expect(fields.getSelectedChannels('where')).toEqual(
            new Map([
                ['c1', general],
                ['c2', lounge]
            ])
        );
    });

    it('throws when a pick falls outside the allowed types', () => {
        expect(codeFrom(() => fields.getSelectedChannels('where', false, [ChannelType.GuildText]))).toBe(
            SeedcordErrorCode.ModalFieldChannelType
        );
    });

    it('throws when a required channel read finds nothing picked', () => {
        const empty = new ModalFields(
            submission([labelled(1, { type: ComponentType.ChannelSelect, id: 2, custom_id: 'where', values: [] })])
        );
        expect(empty.getSelectedChannels('where')).toBeNull();
        expect(codeFrom(() => empty.getSelectedChannels('where', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });

    it('names the type that failed', () => {
        let message = '';
        try {
            fields.getSelectedChannels('where', false, [ChannelType.GuildText]);
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toContain('GuildVoice');
    });
});

describe('file upload', () => {
    const shot = attachment('a1', 'screenshot.png');

    const fields = new ModalFields({
        custom_id: 'form',
        resolved: { attachments: { a1: shot } },
        components: [labelled(1, { type: ComponentType.FileUpload, id: 2, custom_id: 'proof', values: ['a1'] })]
    });

    it('resolves the uploaded attachments', () => {
        expect(fields.getUploadedFiles('proof')).toEqual(new Map([['a1', shot]]));
    });

    it('throws when a required read finds no upload', () => {
        const empty = new ModalFields({
            custom_id: 'form',
            components: [labelled(1, { type: ComponentType.FileUpload, id: 2, custom_id: 'proof', values: [] })]
        });
        expect(codeFrom(() => empty.getUploadedFiles('proof', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });
});

describe('radio groups and checkboxes', () => {
    const fields = new ModalFields(
        submission([
            labelled(1, { type: ComponentType.RadioGroup, id: 2, custom_id: 'plan', value: 'pro' }),
            labelled(3, { type: ComponentType.CheckboxGroup, id: 4, custom_id: 'extras', values: ['sso'] }),
            labelled(5, { type: ComponentType.Checkbox, id: 6, custom_id: 'agree', value: false })
        ])
    );

    it('reads the picked radio option', () => {
        expect(fields.getRadioGroup('plan')).toBe('pro');
    });

    it('reads the checked boxes of a group', () => {
        expect(fields.getCheckboxGroup('extras')).toEqual(['sso']);
    });

    it('keeps an unchecked box false', () => {
        expect(fields.getCheckbox('agree')).toBe(false);
    });

    it('throws when a required radio read finds nothing picked', () => {
        const empty = new ModalFields(
            submission([labelled(1, { type: ComponentType.RadioGroup, id: 2, custom_id: 'plan', value: null })])
        );
        expect(empty.getRadioGroup('plan')).toBeNull();
        expect(codeFrom(() => empty.getRadioGroup('plan', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });

    it('treats an absent radio value the same as a null one', () => {
        // justified: discord.js guards this key against an absent value
        const bare = { type: ComponentType.RadioGroup, id: 2, custom_id: 'plan' } as unknown as ModalSubmitComponent;
        const empty = new ModalFields(submission([labelled(1, bare)]));

        expect(empty.getRadioGroup('plan')).toBeNull();
        expect(codeFrom(() => empty.getRadioGroup('plan', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });
});

describe('payloads the pinned types forbid', () => {
    it('reports a component kind newer than the pinned discord-api-types', () => {
        // justified: no arm of the union covers an unknown type
        const future = { type: 99, id: 2, custom_id: 'weird', value: 'z' } as unknown as ModalSubmitComponent;
        const fields = new ModalFields(submission([labelled(1, future)]));

        expect(codeFrom(() => fields.getTextInputValue('weird'))).toBe(SeedcordErrorCode.ModalFieldWrongKind);

        let message = '';
        try {
            fields.getTextInputValue('weird');
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toContain('component type 99');
        expect(message).toContain('No getter reads that kind');
    });

    it('names a channel type the pinned enum does not carry', () => {
        const odd = channel('c1', 999 as ChannelType);
        const fields = new ModalFields({
            custom_id: 'form',
            resolved: { channels: { c1: odd } },
            components: [labelled(1, { type: ComponentType.ChannelSelect, id: 2, custom_id: 'where', values: ['c1'] })]
        });

        let message = '';
        try {
            fields.getSelectedChannels('where', false, [ChannelType.GuildText]);
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).not.toContain('undefined');
        expect(message).toContain('999');
    });

    it('reads an empty modal when the payload carries no components', () => {
        // justified: the test omits a key the typing marks required
        const bare = { custom_id: 'form' } as unknown as APIModalSubmission;
        const fields = new ModalFields(bare);

        expect(codeFrom(() => fields.getTextInputValue('name'))).toBe(SeedcordErrorCode.ModalFieldNotFound);
    });

    it('reads a select field that carries no values key', () => {
        // justified: discord.js guards this key on every select kind
        const bare = { type: ComponentType.UserSelect, id: 2, custom_id: 'owners' } as unknown as ModalSubmitComponent;
        const fields = new ModalFields({
            custom_id: 'form',
            resolved: { users: { u1: user('u1', 'ada') } },
            components: [labelled(1, bare)]
        });

        expect(fields.getSelectedUsers('owners')).toBeNull();
        expect(codeFrom(() => fields.getSelectedUsers('owners', true))).toBe(SeedcordErrorCode.ModalFieldEmpty);
    });

    it('reads a mentionable field that carries no values key', () => {
        const bare = {
            type: ComponentType.MentionableSelect,
            id: 2,
            custom_id: 'targets'
        } as unknown as ModalSubmitComponent;
        const fields = new ModalFields({
            custom_id: 'form',
            resolved: { users: { u1: user('u1', 'ada') }, roles: { r1: role('r1', 'mods') } },
            components: [labelled(1, bare)]
        });

        expect(fields.getSelectedMentionables('targets')).toBeNull();
    });

    it('returns an empty list for a string select carrying no values key', () => {
        const bare = {
            type: ComponentType.StringSelect,
            id: 2,
            custom_id: 'colors'
        } as unknown as ModalSubmitComponent;
        const group = {
            type: ComponentType.CheckboxGroup,
            id: 4,
            custom_id: 'extras'
        } as unknown as ModalSubmitComponent;
        const fields = new ModalFields(submission([labelled(1, bare), labelled(3, group)]));

        expect(fields.getStringSelectValues('colors')).toEqual([]);
        expect(fields.getCheckboxGroup('extras')).toEqual([]);
    });

    it('ignores ids that name an Object prototype member', () => {
        const fields = new ModalFields({
            custom_id: 'form',
            resolved: { users: {} },
            components: [
                labelled(1, {
                    type: ComponentType.UserSelect,
                    id: 2,
                    custom_id: 'owners',
                    values: ['constructor', 'toString']
                })
            ]
        });

        expect(fields.getSelectedUsers('owners')).toBeNull();
    });
});
