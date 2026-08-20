import { CustomId, defineGate } from '@seedcord/core';
import { expectTypeOf } from 'vitest';

import { EventHandler } from '#handlers/event/EventHandler';
import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '#handlers/interaction/components/ModalHandler';
import { SelectMenuHandler } from '#handlers/interaction/components/SelectMenuHandler';
import { ContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { AnyHandlerCtor, FitAll } from '#bot/gates/matching';
import type { EventGateContext } from '#src/bot/gates/Gate';
import type { SelectMenuKind } from '@seedcord/core';
import type { ApplicationCommandType } from 'discord.js';
import type { Constructor } from 'type-fest';

// typecheck-only, vitest never calls typeChecks

declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        gwkindprobe: { note: { kind: 'string'; required: false } };
    }
}

const ProbeId = new CustomId('gwkindprobe').str('x');

// only a messageCreate event handler fits this
const messageOnly = defineGate('Probe', (ctx: EventGateContext<'messageCreate'>) => {
    void ctx;
});

type Mismatch<Got extends string> = `gate 'Probe' requires a messageCreate event handler, and this handler is ${Got}`;

type LabelOf<TCtor extends AnyHandlerCtor> =
    FitAll<TCtor, [typeof messageOnly]>[0] extends Constructor<[infer Message]> ? Message : never;

class ProbeSlash extends SlashHandler<'gwkindprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeMessageMenu extends ContextMenuHandler<ApplicationCommandType.Message> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeUserMenu extends ContextMenuHandler<ApplicationCommandType.User> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeStringSelect extends SelectMenuHandler<SelectMenuKind.String, [typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeUserSelect extends SelectMenuHandler<SelectMenuKind.User, [typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeRoleSelect extends SelectMenuHandler<SelectMenuKind.Role, [typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeChannelSelect extends SelectMenuHandler<SelectMenuKind.Channel, [typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeMentionableSelect extends SelectMenuHandler<SelectMenuKind.Mentionable, [typeof ProbeId]> {
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

class ProbeAutocomplete extends AutocompleteHandler<'gwkindprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class ProbeMemberEvent extends EventHandler<'guildMemberAdd'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

function typeChecks(): void {
    expectTypeOf<LabelOf<typeof ProbeSlash>>().toEqualTypeOf<Mismatch<'Slash'>>();
    expectTypeOf<LabelOf<typeof ProbeMessageMenu>>().toEqualTypeOf<Mismatch<'MessageMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeUserMenu>>().toEqualTypeOf<Mismatch<'UserMenu'>>();
    expectTypeOf<LabelOf<typeof ProbeStringSelect>>().toEqualTypeOf<Mismatch<'StringSelect'>>();
    expectTypeOf<LabelOf<typeof ProbeUserSelect>>().toEqualTypeOf<Mismatch<'UserSelect'>>();
    expectTypeOf<LabelOf<typeof ProbeRoleSelect>>().toEqualTypeOf<Mismatch<'RoleSelect'>>();
    expectTypeOf<LabelOf<typeof ProbeChannelSelect>>().toEqualTypeOf<Mismatch<'ChannelSelect'>>();
    expectTypeOf<LabelOf<typeof ProbeMentionableSelect>>().toEqualTypeOf<Mismatch<'MentionableSelect'>>();
    expectTypeOf<LabelOf<typeof ProbeButton>>().toEqualTypeOf<Mismatch<'Button'>>();
    expectTypeOf<LabelOf<typeof ProbeModal>>().toEqualTypeOf<Mismatch<'Modal'>>();
    expectTypeOf<LabelOf<typeof ProbeAutocomplete>>().toEqualTypeOf<Mismatch<'autocomplete'>>();
    expectTypeOf<LabelOf<typeof ProbeMemberEvent>>().toEqualTypeOf<Mismatch<'guildMemberAdd event'>>();
}

void typeChecks;
