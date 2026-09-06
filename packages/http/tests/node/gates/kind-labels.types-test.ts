import { CustomId, RequireBotPermissions } from '@seedcord/core';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { expectTypeOf } from 'vitest';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '#handlers/interaction/components/ModalHandler';
import {
    ChannelMenuHandler,
    MentionableMenuHandler,
    RoleMenuHandler,
    StringMenuHandler,
    UserMenuHandler
} from '#handlers/interaction/components/SelectMenuHandler';
import { UserContextMenuHandler, MessageContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { AnyHandlerCtor, FitAll } from '#src/gates/matching';
import type { Constructor } from 'type-fest';

declare module '@seedcord/core' {
    interface SlashRegistry {
        httpkindprobe: { options: { note: { kind: 'string'; required: false } }; cache: 'cached' };
    }
}

const ProbeId = new CustomId('httpkindprobe').str('x');

// no http handler provides GuildPermissionsContext
const guildScoped = RequireBotPermissions([PermissionFlagsBits.BanMembers], { in: 'guild' });

type Mismatch<Got extends string> =
    `gate 'RequireBotPermissions' requires a gateway (guild permissions) handler, and this handler is ${Got}`;

type LabelOf<TCtor extends AnyHandlerCtor> =
    FitAll<TCtor, [typeof guildScoped]>[0] extends Constructor<[infer Message]> ? Message : never;

class ProbeSlash extends SlashHandler<'httpkindprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeMessageMenu extends MessageContextMenuHandler<never> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeUserMenu extends UserContextMenuHandler<never> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeStringSelect extends StringMenuHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeUserSelect extends UserMenuHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeRoleSelect extends RoleMenuHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeChannelSelect extends ChannelMenuHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeMentionableSelect extends MentionableMenuHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeButton extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeModal extends ModalHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeAutocomplete extends AutocompleteHandler<'httpkindprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// compile-only. tc is the assertion.
function typeChecks(): void {
    expectTypeOf<LabelOf<typeof ProbeSlash>>().toEqualTypeOf<Mismatch<'Slash'>>();
    expectTypeOf<LabelOf<typeof ProbeMessageMenu>>().toEqualTypeOf<Mismatch<'MessageContextMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeUserMenu>>().toEqualTypeOf<Mismatch<'UserContextMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeStringSelect>>().toEqualTypeOf<Mismatch<'StringMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeUserSelect>>().toEqualTypeOf<Mismatch<'UserMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeRoleSelect>>().toEqualTypeOf<Mismatch<'RoleMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeChannelSelect>>().toEqualTypeOf<Mismatch<'ChannelMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeMentionableSelect>>().toEqualTypeOf<Mismatch<'MentionableMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeButton>>().toEqualTypeOf<Mismatch<'Button'>>();
    expectTypeOf<LabelOf<typeof ProbeModal>>().toEqualTypeOf<Mismatch<'Modal'>>();
    expectTypeOf<LabelOf<typeof ProbeAutocomplete>>().toEqualTypeOf<Mismatch<'autocomplete'>>();
}

// no-unused-vars does not count a name used only in a type position
void [
    ProbeId,
    guildScoped,
    typeChecks,
    ProbeSlash,
    ProbeMessageMenu,
    ProbeUserMenu,
    ProbeStringSelect,
    ProbeUserSelect,
    ProbeRoleSelect,
    ProbeChannelSelect,
    ProbeMentionableSelect,
    ProbeButton,
    ProbeModal,
    ProbeAutocomplete
];
