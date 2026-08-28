import { CustomId, ModalRoute, SelectMenuKind, SelectMenuRoute } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { ModalHandler, SelectMenuHandler } from '#handlers/interaction/components';

import type { Core } from '#interfaces/Core';
import type { ModalSubmitInteraction, UserSelectMenuInteraction } from 'discord.js';

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

function userSelect(customId: string, resolved: object): UserSelectMenuInteraction<'cached'> {
    return { customId, values: ['u1'], ...resolved } as unknown as UserSelectMenuInteraction<'cached'>;
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

describe('select accessors', () => {
    it('reads the picked ids off the interaction', () => {
        @SelectMenuRoute(SelectMenuKind.User, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): string[] {
                return this.values;
            }
        }

        const event = userSelect(AssignId.encode({ roleId: 'r1' }), {});

        expect(new Assign(event, core).read()).toEqual(['u1']);
    });

    it('reads the resolved users and members off the interaction', () => {
        const users = new Map([['u1', { id: 'u1' }]]);
        const members = new Map([['u1', { nick: 'boss' }]]);

        @SelectMenuRoute(SelectMenuKind.User, AssignId)
        class Assign extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }

            read(): [unknown, unknown] {
                return [this.users, this.members];
            }
        }

        const event = userSelect(AssignId.encode({ roleId: 'r1' }), { users, members });

        expect(new Assign(event, core).read()).toEqual([users, members]);
    });
});
