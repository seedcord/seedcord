import { CustomId } from '@seedcord/core';
import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ModalHandler } from '#handlers/interaction/components/ModalHandler';
import { ModalFields } from '#inputs/ModalFields';
import { ModalRoute } from '#src/index';

import type { Core } from '#interfaces/Core';
import type { APIModalSubmitInteraction } from 'discord-api-types/v10';

const ConfigId = new CustomId('config').str('guildId');

// justified: reading the fields never reaches core
const core = {} as unknown as Core;

function modalEvent(customId: string): APIModalSubmitInteraction {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 5,
        data: {
            custom_id: customId,
            components: [
                {
                    type: ComponentType.Label,
                    id: 1,
                    component: { type: ComponentType.TextInput, id: 2, custom_id: 'name', value: 'seedcord' }
                }
            ]
        }
    } as unknown as APIModalSubmitInteraction;
}

describe('modal fields on the http handler', () => {
    it('reads a submitted input through this.fields', async () => {
        let seen = '';

        @ModalRoute(ConfigId)
        class ConfigModal extends ModalHandler<[typeof ConfigId]> {
            async execute(): Promise<void> {
                seen = this.fields.getTextInputValue('name');
                await Promise.resolve();
            }
        }

        await new ConfigModal(modalEvent(ConfigId.encode({ guildId: 'g1' })), core).execute();

        expect(seen).toBe('seedcord');
    });

    it('builds the reader once and reuses it', async () => {
        let first: unknown;
        let second: unknown;

        @ModalRoute(ConfigId)
        class ConfigModal extends ModalHandler<[typeof ConfigId]> {
            execute(): Promise<void> {
                first = this.fields;
                second = this.fields;
                return Promise.resolve();
            }
        }

        await new ConfigModal(modalEvent(ConfigId.encode({ guildId: 'g1' })), core).execute();

        expect(first).toBeInstanceOf(ModalFields);
        expect(first).toBe(second);
    });
});
