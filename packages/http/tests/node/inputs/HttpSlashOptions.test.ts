import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { HttpSlashOptions } from '@inputs/HttpSlashOptions';

import type {
    APIApplicationCommandAutocompleteInteraction,
    APIApplicationCommandInteractionDataOption,
    APIChatInputApplicationCommandInteractionData,
    APIInteractionDataResolved,
    APIInteractionDataResolvedGuildMember,
    APIUser,
    InteractionType
} from 'discord-api-types/v10';

const user: APIUser = {
    id: 'u1',
    username: 'dhruv',
    discriminator: '0',
    global_name: 'Dhruv',
    avatar: null
};

// justified: the fixture carries only the fields the tests read
function member(nick: string): APIInteractionDataResolvedGuildMember {
    return { nick, roles: [], permissions: '0' } as unknown as APIInteractionDataResolvedGuildMember;
}

function chatData(
    options: APIApplicationCommandInteractionDataOption<InteractionType.ApplicationCommand>[],
    resolved?: APIInteractionDataResolved
): APIChatInputApplicationCommandInteractionData {
    return { id: 'c1', name: 'cmd', type: 1, options, ...(!(resolved === undefined) && { resolved }) };
}

describe('scalar options', () => {
    const data = chatData([
        { name: 'label', type: ApplicationCommandOptionType.String, value: 'hi' },
        { name: 'count', type: ApplicationCommandOptionType.Integer, value: 3 },
        { name: 'ratio', type: ApplicationCommandOptionType.Number, value: 0.5 },
        { name: 'silent', type: ApplicationCommandOptionType.Boolean, value: false }
    ]);
    const options = new HttpSlashOptions(data);

    it('returns scalar values by kind', () => {
        expect(options.getString('label')).toBe('hi');
        expect(options.getInteger('count')).toBe(3);
        expect(options.getNumber('ratio')).toBe(0.5);
    });

    it('preserves boolean false', () => {
        expect(options.getBoolean('silent')).toBe(false);
    });

    it('returns null for a missing option', () => {
        expect(options.getString('nope')).toBeNull();
    });

    it('returns null for a kind mismatch', () => {
        expect(options.getInteger('label')).toBeNull();
    });
});

describe('resolved rich options', () => {
    const resolved: APIInteractionDataResolved = {
        users: { u1: user },
        members: { u1: member('nick') },
        roles: { r1: { id: 'r1', name: 'mod' } as never },
        channels: { ch1: { id: 'ch1', name: 'general', type: 0, permissions: '0' } },
        attachments: { a1: { id: 'a1', filename: 'f.png' } as never }
    };
    const data = chatData(
        [
            { name: 'who', type: ApplicationCommandOptionType.User, value: 'u1' },
            { name: 'what', type: ApplicationCommandOptionType.Role, value: 'r1' },
            { name: 'where', type: ApplicationCommandOptionType.Channel, value: 'ch1' },
            { name: 'file', type: ApplicationCommandOptionType.Attachment, value: 'a1' }
        ],
        resolved
    );
    const options = new HttpSlashOptions(data);

    it('dereferences users, roles, channels, attachments by snowflake', () => {
        expect(options.getUser('who')).toEqual(user);
        expect(options.getRole('what')?.id).toBe('r1');
        expect(options.getChannel('where')?.id).toBe('ch1');
        expect(options.getAttachment('file')?.id).toBe('a1');
    });

    it('resolves the member for a user option, null when absent from resolved', () => {
        expect(options.getMember('who')?.nick).toBe('nick');
        const noMembers = new HttpSlashOptions(
            chatData([{ name: 'who', type: ApplicationCommandOptionType.User, value: 'u1' }], { users: { u1: user } })
        );
        expect(noMembers.getMember('who')).toBeNull();
        expect(noMembers.getUser('who')).toEqual(user);
    });

    it('returns null when the snowflake is missing from resolved', () => {
        const stale = new HttpSlashOptions(
            chatData([{ name: 'who', type: ApplicationCommandOptionType.User, value: 'ghost' }], { users: {} })
        );
        expect(stale.getUser('who')).toBeNull();
    });
});

describe('mentionable resolution order', () => {
    it('prefers member, then user, then role', () => {
        const asMember = new HttpSlashOptions(
            chatData([{ name: 'target', type: ApplicationCommandOptionType.Mentionable, value: 'u1' }], {
                users: { u1: user },
                members: { u1: member('m') }
            })
        );
        expect(asMember.getMentionable('target')).toEqual(member('m'));

        const asUser = new HttpSlashOptions(
            chatData([{ name: 'target', type: ApplicationCommandOptionType.Mentionable, value: 'u1' }], {
                users: { u1: user }
            })
        );
        expect(asUser.getMentionable('target')).toEqual(user);

        const asRole = new HttpSlashOptions(
            chatData([{ name: 'target', type: ApplicationCommandOptionType.Mentionable, value: 'r1' }], {
                roles: { r1: { id: 'r1', name: 'mod' } as never }
            })
        );
        expect(asRole.getMentionable('target')).toMatchObject({ id: 'r1' });
    });

    it('returns null when the snowflake is absent from every resolved map', () => {
        const options = new HttpSlashOptions(
            chatData([{ name: 'target', type: ApplicationCommandOptionType.Mentionable, value: 'ghost' }], {
                users: { u1: user }
            })
        );
        expect(options.getMentionable('target')).toBeNull();
    });
});

describe('subcommand hoisting', () => {
    it('hoists through a subcommand', () => {
        const options = new HttpSlashOptions(
            chatData([
                {
                    name: 'setup',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [{ name: 'label', type: ApplicationCommandOptionType.String, value: 'nested' }]
                }
            ])
        );
        expect(options.getString('label')).toBe('nested');
    });

    it('hoists through a group then a subcommand', () => {
        const options = new HttpSlashOptions(
            chatData([
                {
                    name: 'grp',
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    options: [
                        {
                            name: 'setup',
                            type: ApplicationCommandOptionType.Subcommand,
                            options: [{ name: 'count', type: ApplicationCommandOptionType.Integer, value: 7 }]
                        }
                    ]
                }
            ])
        );
        expect(options.getInteger('count')).toBe(7);
    });

    it('handles a subcommand with no options', () => {
        const options = new HttpSlashOptions(
            chatData([{ name: 'setup', type: ApplicationCommandOptionType.Subcommand }])
        );
        expect(options.getString('label')).toBeNull();
    });
});

describe('autocomplete payloads', () => {
    function autocompleteData(
        options: APIApplicationCommandInteractionDataOption<InteractionType.ApplicationCommandAutocomplete>[]
    ): APIApplicationCommandAutocompleteInteraction['data'] {
        return { id: 'c1', name: 'cmd', type: 1, options };
    }

    it('finds the focused option and returns its partial as a string', () => {
        const options = new HttpSlashOptions(
            autocompleteData([
                { name: 'query', type: ApplicationCommandOptionType.String, value: 'par', focused: true },
                { name: 'limit', type: ApplicationCommandOptionType.Integer, value: '5' }
            ])
        );
        expect(options.getFocused()).toEqual({ name: 'query', value: 'par' });
    });

    it('finds the focused option under a subcommand', () => {
        const options = new HttpSlashOptions(
            autocompleteData([
                {
                    name: 'setup',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [{ name: 'query', type: ApplicationCommandOptionType.String, value: 'x', focused: true }]
                }
            ])
        );
        expect(options.getFocused()).toEqual({ name: 'query', value: 'x' });
    });

    it('stringifies a numeric focused partial', () => {
        const options = new HttpSlashOptions(
            autocompleteData([{ name: 'limit', type: ApplicationCommandOptionType.Integer, value: '4', focused: true }])
        );
        expect(options.getFocused()).toEqual({ name: 'limit', value: '4' });
    });

    it('returns null when no option is focused', () => {
        const options = new HttpSlashOptions(
            autocompleteData([{ name: 'limit', type: ApplicationCommandOptionType.Integer, value: '4' }])
        );
        expect(options.getFocused()).toBeNull();
    });

    it('coerces entered numeric siblings, the autocomplete wire carries them as strings', () => {
        const options = new HttpSlashOptions(
            autocompleteData([
                { name: 'query', type: ApplicationCommandOptionType.String, value: 'par', focused: true },
                { name: 'limit', type: ApplicationCommandOptionType.Integer, value: '5' }
            ])
        );
        expect(options.getInteger('limit')).toBe(5);
        expect(options.getString('query')).toBe('par');
    });

    it('returns null for a numeric sibling that does not parse', () => {
        const options = new HttpSlashOptions(
            autocompleteData([{ name: 'limit', type: ApplicationCommandOptionType.Integer, value: '4e' }])
        );
        expect(options.getInteger('limit')).toBeNull();
    });

    it('coerces a number-kind sibling string', () => {
        const options = new HttpSlashOptions(
            autocompleteData([{ name: 'ratio', type: ApplicationCommandOptionType.Number, value: '0.5' }])
        );
        expect(options.getNumber('ratio')).toBe(0.5);
    });
});
