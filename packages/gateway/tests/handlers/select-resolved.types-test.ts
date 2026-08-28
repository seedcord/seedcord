import { CustomId, SelectMenuKind, SelectMenuRoute } from '@seedcord/core';
import { expectTypeOf } from 'vitest';

import { SelectMenuHandler } from '#handlers/interaction/components';

import type { ChannelSelectMenuInteraction, UserSelectMenuInteraction } from 'discord.js';

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

export type Probes = [StringProbe, UserProbe, ChannelProbe];
