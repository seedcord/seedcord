import { CustomId, SelectMenuKind } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { SelectMenuHandler } from '#handlers/interaction/components/SelectMenuHandler';
import { SelectMenuRoute } from '#src/index';

import type { Core } from '#interfaces/Core';
import type {
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIMessageChannelSelectInteractionData,
    APIMessageComponentSelectMenuInteraction,
    APIMessageMentionableSelectInteractionData,
    APIMessageRoleSelectInteractionData,
    APIMessageStringSelectInteractionData,
    APIMessageUserSelectInteractionData,
    APIRole,
    APIUser
} from 'discord-api-types/v10';

const AssignId = new CustomId('assign').str('roleId');

// justified: reading resolved data never reaches core
const core = {} as unknown as Core;

const ada: APIUser = { id: 'u1', username: 'ada', discriminator: '0', global_name: 'ada', avatar: null };

// justified: each fixture carries only the fields the assertions read
const boss = { nick: 'boss', roles: [], permissions: '0' } as unknown as APIInteractionDataResolvedGuildMember;
const mods = { id: 'r1', name: 'mods' } as unknown as APIRole;
const general = { id: 'c1', name: 'general', type: 0, permissions: '0' } as APIInteractionDataResolvedChannel;

type SelectEvent<Data> = APIMessageComponentSelectMenuInteraction & { data: Data };
type StringSelectEvent = SelectEvent<APIMessageStringSelectInteractionData>;
type UserSelectEvent = SelectEvent<APIMessageUserSelectInteractionData>;
type RoleSelectEvent = SelectEvent<APIMessageRoleSelectInteractionData>;
type ChannelSelectEvent = SelectEvent<APIMessageChannelSelectInteractionData>;
type MentionableSelectEvent = SelectEvent<APIMessageMentionableSelectInteractionData>;

// justified: the bases touch data alone on this event
function selectEvent<Event extends APIMessageComponentSelectMenuInteraction>(customId: string, data: object): Event {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 3,
        data: { custom_id: customId, ...data }
    } as unknown as Event;
}

describe('picked ids', () => {
    it('reads the raw values off any kind', async () => {
        let values: unknown;

        @SelectMenuRoute(SelectMenuKind.String, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.String, [typeof AssignId]> {
            async execute(): Promise<void> {
                values = this.values;
                await Promise.resolve();
            }
        }

        const event = selectEvent<StringSelectEvent>(AssignId.encode({ roleId: 'r1' }), {
            component_type: 3,
            values: ['red', 'blue']
        });
        await new Assign(event, core).execute();

        expect(values).toEqual(['red', 'blue']);
    });
});

describe('a payload carrying no values key', () => {
    it('reads as an empty pick, the same as gateway', async () => {
        let values: unknown;
        let users: unknown;

        @SelectMenuRoute(SelectMenuKind.User, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {
            async execute(): Promise<void> {
                values = this.values;
                users = this.users;
                await Promise.resolve();
            }
        }

        const event = selectEvent<UserSelectEvent>(AssignId.encode({ roleId: 'r1' }), {
            component_type: 5,
            resolved: { users: { u1: ada } }
        });
        await new Assign(event, core).execute();

        expect(values).toEqual([]);
        expect(users).toEqual(new Map());
    });
});

describe('user select', () => {
    it('resolves the picked users and members', async () => {
        let users: unknown;
        let members: unknown;

        @SelectMenuRoute(SelectMenuKind.User, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {
            async execute(): Promise<void> {
                users = this.users;
                members = this.members;
                await Promise.resolve();
            }
        }

        const event = selectEvent<UserSelectEvent>(AssignId.encode({ roleId: 'r1' }), {
            component_type: 5,
            values: ['u1'],
            resolved: { users: { u1: ada }, members: { u1: boss } }
        });
        await new Assign(event, core).execute();

        expect(users).toEqual(new Map([['u1', ada]]));
        expect(members).toEqual(new Map([['u1', boss]]));
    });

    it('returns an empty map when the guild resolved no member', async () => {
        let members: unknown;

        @SelectMenuRoute(SelectMenuKind.User, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {
            async execute(): Promise<void> {
                members = this.members;
                await Promise.resolve();
            }
        }

        const event = selectEvent<UserSelectEvent>(AssignId.encode({ roleId: 'r1' }), {
            component_type: 5,
            values: ['u1'],
            resolved: { users: { u1: ada } }
        });
        await new Assign(event, core).execute();

        expect(members).toEqual(new Map());
    });
});

describe('role and channel selects', () => {
    it('resolves the picked roles', async () => {
        let roles: unknown;

        @SelectMenuRoute(SelectMenuKind.Role, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.Role, [typeof AssignId]> {
            async execute(): Promise<void> {
                roles = this.roles;
                await Promise.resolve();
            }
        }

        const event = selectEvent<RoleSelectEvent>(AssignId.encode({ roleId: 'r1' }), {
            component_type: 6,
            values: ['r1'],
            resolved: { roles: { r1: mods } }
        });
        await new Assign(event, core).execute();

        expect(roles).toEqual(new Map([['r1', mods]]));
    });

    it('resolves the picked channels', async () => {
        let channels: unknown;

        @SelectMenuRoute(SelectMenuKind.Channel, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.Channel, [typeof AssignId]> {
            async execute(): Promise<void> {
                channels = this.channels;
                await Promise.resolve();
            }
        }

        const event = selectEvent<ChannelSelectEvent>(AssignId.encode({ roleId: 'r1' }), {
            component_type: 8,
            values: ['c1'],
            resolved: { channels: { c1: general } }
        });
        await new Assign(event, core).execute();

        expect(channels).toEqual(new Map([['c1', general]]));
    });
});

describe('mentionable select', () => {
    it('splits one field into its users, members, and roles', async () => {
        let users: unknown;
        let members: unknown;
        let roles: unknown;

        @SelectMenuRoute(SelectMenuKind.Mentionable, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.Mentionable, [typeof AssignId]> {
            async execute(): Promise<void> {
                users = this.users;
                members = this.members;
                roles = this.roles;
                await Promise.resolve();
            }
        }

        const event = selectEvent<MentionableSelectEvent>(AssignId.encode({ roleId: 'r1' }), {
            component_type: 7,
            values: ['u1', 'r1'],
            resolved: { users: { u1: ada }, members: { u1: boss }, roles: { r1: mods } }
        });
        await new Assign(event, core).execute();

        expect(users).toEqual(new Map([['u1', ada]]));
        expect(members).toEqual(new Map([['u1', boss]]));
        expect(roles).toEqual(new Map([['r1', mods]]));
    });
});
