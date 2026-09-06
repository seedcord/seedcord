import {
    ChannelMenuRoute,
    CustomId,
    MentionableMenuRoute,
    ModalRoute,
    RoleMenuRoute,
    StringMenuRoute,
    UserMenuRoute
} from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import {
    ChannelMenuHandler,
    MentionableMenuHandler,
    ModalHandler,
    RoleMenuHandler,
    StringMenuHandler,
    UserMenuHandler
} from '#handlers/interaction/components';

import type { Core } from '#interfaces/Core';
import type { ModalSubmitInteraction } from 'discord.js';

const core = {} as unknown as Core;

const ConfigId = new CustomId('config').str('guildId');
const AssignId = new CustomId('assign').str('roleId');

// each fake carries only the fields the accessors forward
function modal(customId: string, inputs: Record<string, string>): ModalSubmitInteraction<'cached'> {
    return {
        customId,
        fields: { getTextInputValue: (id: string) => inputs[id] ?? '' }
    } as unknown as ModalSubmitInteraction<'cached'>;
}

// justified: the bases read only customId, values, and their kind's resolved collections
function select<Event>(customId: string, values: string[], resolved: object = {}): Event {
    return { customId, values, ...resolved } as unknown as Event;
}

describe('modal fields', () => {
    it('reads a submitted input through this.fields', () => {
        @ModalRoute(ConfigId)
        class ConfigModal extends ModalHandler<[typeof ConfigId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): string {
                return this.fields.getTextInputValue('name');
            }
        }

        const event = modal(ConfigId.encode({ guildId: 'g1' }), { name: 'seedcord' });

        expect(new ConfigModal(event, core).read()).toBe('seedcord');
    });
});

describe('every menu base reads its own members', () => {
    const wire = AssignId.encode({ roleId: 'r1' });

    it('a string menu reads the picked values', () => {
        @StringMenuRoute(AssignId)
        class Topics extends StringMenuHandler<[typeof AssignId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): string[] {
                return this.values;
            }
        }

        expect(new Topics(select(wire, ['releases', 'outages']), core).read()).toEqual(['releases', 'outages']);
    });

    it('a user menu reads the resolved users and members', () => {
        const users = new Map([['u1', { id: 'u1' }]]);
        const members = new Map([['u1', { nick: 'boss' }]]);

        @UserMenuRoute(AssignId)
        class Assign extends UserMenuHandler<[typeof AssignId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): [string[], unknown, unknown] {
                return [this.values, this.users, this.members];
            }
        }

        const handler = new Assign(select(wire, ['u1'], { users, members }), core);

        expect(handler.read()).toEqual([['u1'], users, members]);
    });

    it('a role menu reads the resolved roles', () => {
        const roles = new Map([['r9', { id: 'r9' }]]);

        @RoleMenuRoute(AssignId)
        class Grant extends RoleMenuHandler<[typeof AssignId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): unknown {
                return this.roles;
            }
        }

        expect(new Grant(select(wire, ['r9'], { roles }), core).read()).toEqual(roles);
    });

    it('a channel menu reads the resolved channels', () => {
        const channels = new Map([['c4', { id: 'c4' }]]);

        @ChannelMenuRoute(AssignId)
        class LogTarget extends ChannelMenuHandler<[typeof AssignId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): unknown {
                return this.channels;
            }
        }

        expect(new LogTarget(select(wire, ['c4'], { channels }), core).read()).toEqual(channels);
    });

    it('a mentionable menu reads users, members, and roles together', () => {
        const users = new Map([['u1', { id: 'u1' }]]);
        const members = new Map([['u1', { nick: 'boss' }]]);
        const roles = new Map([['r9', { id: 'r9' }]]);

        @MentionableMenuRoute(AssignId)
        class Invite extends MentionableMenuHandler<[typeof AssignId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): [unknown, unknown, unknown] {
                return [this.users, this.members, this.roles];
            }
        }

        const handler = new Invite(select(wire, ['u1', 'r9'], { users, members, roles }), core);

        expect(handler.read()).toEqual([users, members, roles]);
    });
});
