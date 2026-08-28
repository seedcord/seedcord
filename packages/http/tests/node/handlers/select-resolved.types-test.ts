import { CustomId, SelectMenuKind } from '@seedcord/core';
import { expectTypeOf } from 'vitest';

import { SelectMenuHandler } from '#handlers/interaction/components/SelectMenuHandler';
import { SelectMenuRoute } from '#src/index';

import type {
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIRole,
    APIUser
} from 'discord-api-types/v10';

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
        expectTypeOf(this.users).toEqualTypeOf<Map<string, APIUser>>();
        expectTypeOf(this.members).toEqualTypeOf<Map<string, APIInteractionDataResolvedGuildMember>>();
        expectTypeOf(this.roles).toBeNever();
        expectTypeOf(this.channels).toBeNever();
        return Promise.resolve();
    }
}

@SelectMenuRoute(SelectMenuKind.Channel, ProbeId)
class ChannelProbe extends SelectMenuHandler<SelectMenuKind.Channel, [typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.channels).toEqualTypeOf<Map<string, APIInteractionDataResolvedChannel>>();
        expectTypeOf(this.users).toBeNever();
        return Promise.resolve();
    }
}

@SelectMenuRoute(SelectMenuKind.Mentionable, ProbeId)
class MentionableProbe extends SelectMenuHandler<SelectMenuKind.Mentionable, [typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.users).toEqualTypeOf<Map<string, APIUser>>();
        expectTypeOf(this.roles).toEqualTypeOf<Map<string, APIRole>>();
        expectTypeOf(this.channels).toBeNever();
        return Promise.resolve();
    }
}

export type Probes = [StringProbe, UserProbe, ChannelProbe, MentionableProbe];
