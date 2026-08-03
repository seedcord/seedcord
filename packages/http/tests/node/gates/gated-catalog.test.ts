import 'reflect-metadata';

import {
    ButtonRoute,
    CustomId,
    GuildOnly,
    ModalRoute,
    RequireBotPermissions,
    RequirePermissions,
    SelectMenuKind,
    SelectMenuRoute
} from '@seedcord/core';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '@handlers/interaction/components/ModalHandler';
import { SelectMenuHandler } from '@handlers/interaction/components/SelectMenuHandler';
import { ContextMenuHandler } from '@handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';
import { Gated } from '@src/gates/Gated';

import type { ApplicationCommandType } from 'discord-api-types/v10';

declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        httpgateprobe: { note: { kind: 'string'; required: false } };
    }
}

const ButtonProbeId = new CustomId('httpgatebtn').str('x');
const SelectProbeId = new CustomId('httpgatesel').str('x');
const ModalProbeId = new CustomId('httpgatemodal').str('x');

describe('@Gated on http handlers with core catalog gates', () => {
    it('attaches an agnostic core gate to a slash handler', () => {
        @Gated(GuildOnly())
        class Handler extends SlashHandler<'httpgateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches RequirePermissions to a slash handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends SlashHandler<'httpgateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches RequirePermissions to a button handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.ManageMessages]))
        @ButtonRoute(ButtonProbeId)
        class Handler extends ButtonHandler<[typeof ButtonProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches RequirePermissions to a select menu handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.ManageMessages]))
        @SelectMenuRoute(SelectMenuKind.User, SelectProbeId)
        class Handler extends SelectMenuHandler<SelectMenuKind.User, [typeof SelectProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches RequireBotPermissions to a modal handler', () => {
        @Gated(RequireBotPermissions([PermissionFlagsBits.SendMessages]))
        @ModalRoute(ModalProbeId)
        class Handler extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches a core gate to a context menu handler', () => {
        @Gated(GuildOnly())
        class Handler extends ContextMenuHandler<ApplicationCommandType.User> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects any gate on an autocomplete handler', () => {
        // @ts-expect-error autocomplete has no reply target, no gate fits it
        @Gated(GuildOnly())
        class Handler extends AutocompleteHandler<'httpgateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a guild-scoped RequirePermissions on a slash handler', () => {
        // @ts-expect-error in:'guild' requires the base role sets, which the http payload never carries
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
        class Handler extends SlashHandler<'httpgateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a guild-scoped RequireBotPermissions on a button handler', () => {
        // @ts-expect-error in:'guild' requires the bot's base role set, unavailable on the http transport
        @Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
        class Handler extends ButtonHandler<[typeof ButtonProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });
});
