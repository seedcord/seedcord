import { CustomId, SelectMenuKind, SelectMenuRoute } from '@seedcord/core';
import { expectTypeOf } from 'vitest';

import { SelectMenuHandler } from '#handlers/interaction/components';

import type {
    ChannelSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    UserSelectMenuInteraction
} from 'discord.js';

const ProbeId = new CustomId('selectprobe').str('x');

@SelectMenuRoute(SelectMenuKind.String, ProbeId)
class StringProbe extends SelectMenuHandler<SelectMenuKind.String, [typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.users).toBeNever();
        expectTypeOf(this.members).toBeNever();
        expectTypeOf(this.roles).toBeNever();
        expectTypeOf(this.channels).toBeNever();
        return Promise.resolve();
    }
}

@SelectMenuRoute(SelectMenuKind.User, ProbeId)
class UserProbe extends SelectMenuHandler<SelectMenuKind.User, [typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.users).toEqualTypeOf<UserSelectMenuInteraction<'cached'>['users']>();
        expectTypeOf(this.members).toEqualTypeOf<UserSelectMenuInteraction<'cached'>['members']>();
        expectTypeOf(this.roles).toBeNever();
        expectTypeOf(this.channels).toBeNever();
        return Promise.resolve();
    }
}

@SelectMenuRoute(SelectMenuKind.Channel, ProbeId)
class ChannelProbe extends SelectMenuHandler<SelectMenuKind.Channel, [typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.channels).toEqualTypeOf<ChannelSelectMenuInteraction<'cached'>['channels']>();
        expectTypeOf(this.users).toBeNever();
        return Promise.resolve();
    }
}

@SelectMenuRoute(SelectMenuKind.Mentionable, ProbeId)
class MentionableProbe extends SelectMenuHandler<SelectMenuKind.Mentionable, [typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.users).toEqualTypeOf<MentionableSelectMenuInteraction<'cached'>['users']>();
        expectTypeOf(this.roles).toEqualTypeOf<MentionableSelectMenuInteraction<'cached'>['roles']>();
        expectTypeOf(this.channels).toBeNever();
        return Promise.resolve();
    }
}

// a union kind carries only what every arm of it resolves, the same as http
class UnionProbe extends SelectMenuHandler<SelectMenuKind.String | SelectMenuKind.User, [typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.users).toBeNever();
        expectTypeOf(this.members).toBeNever();
        return Promise.resolve();
    }
}

export type Probes = [StringProbe, UserProbe, ChannelProbe, MentionableProbe, UnionProbe];
