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

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '#handlers/interaction/components/ModalHandler';
import { SelectMenuHandler } from '#handlers/interaction/components/SelectMenuHandler';
import { ContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { Gated } from '#src/gates/Gated';

import type { ApplicationCommandType } from 'discord-api-types/v10';

declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        httpgateprobe: { note: { kind: 'string'; required: false } };
    }
}

const ButtonProbeId = new CustomId('httpgatebtn').str('x');
const SelectProbeId = new CustomId('httpgatesel').str('x');
const ModalProbeId = new CustomId('httpgatemodal').str('x');

@Gated(GuildOnly())
class AttachesAgnosticCoreGateSlash extends SlashHandler<'httpgateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesAgnosticCoreGateSlash;

@Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
class AttachesRequirePermissions extends SlashHandler<'httpgateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesRequirePermissions;

@Gated(RequirePermissions([PermissionFlagsBits.ManageMessages]))
@ButtonRoute(ButtonProbeId)
class AttachesRequirePermissions2 extends ButtonHandler<[typeof ButtonProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesRequirePermissions2;

@Gated(RequirePermissions([PermissionFlagsBits.ManageMessages]))
@SelectMenuRoute(SelectMenuKind.User, SelectProbeId)
class AttachesRequirePermissions3 extends SelectMenuHandler<SelectMenuKind.User, [typeof SelectProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesRequirePermissions3;

@Gated(RequireBotPermissions([PermissionFlagsBits.SendMessages]))
@ModalRoute(ModalProbeId)
class AttachesRequireBotPermissions extends ModalHandler<[typeof ModalProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesRequireBotPermissions;

@Gated(GuildOnly())
class AttachesCoreGateContextMenu extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesCoreGateContextMenu;

// @ts-expect-error autocomplete has no reply target, no gate fits it
@Gated(GuildOnly())
class RejectsAnyGateAutocomplete extends AutocompleteHandler<'httpgateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsAnyGateAutocomplete;

// @ts-expect-error in:'guild' requires the base role sets, which the http payload never carries
@Gated(RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
class RejectsGuildScopedRequirePermissions extends SlashHandler<'httpgateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsGuildScopedRequirePermissions;

// @ts-expect-error in:'guild' requires the bot's base role set, unavailable on the http transport
@Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
class RejectsGuildScopedRequireBotPermissions extends ButtonHandler<[typeof ButtonProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsGuildScopedRequireBotPermissions;
