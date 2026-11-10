import { RequirePermissions } from '@seedcord/core';
import { DispatchContext } from '@seedcord/core/internal';
import { GuildMember, Message, MessageReaction, PermissionFlagsBits, User, VoiceState } from 'discord.js';
import { describe, it, expect } from 'vite-plus/test';

import { eventGateContext, interactionGateContext } from '#bot/gates/context';

import type { Core } from '#interfaces/Core';
import type { ButtonInteraction } from 'discord.js';

const dispatch = new DispatchContext('button', 'probe');

// a real GuildMember instance for the builder's instanceof guard, carrying only what the builder reads
function fakeMember(roleIds: string[], permissionBits: bigint): GuildMember {
    const member = Object.create(GuildMember.prototype) as GuildMember;
    Object.defineProperties(member, {
        roles: { value: { cache: new Map(roleIds.map((id) => [id, {}])) } },
        permissions: { value: { bitfield: permissionBits } }
    });
    return member;
}

describe('interactionGateContext', () => {
    it('builds the interaction context with the scalar identity', () => {
        // a minimal interaction-shaped fake, the builder only reads these fields
        const interaction = {
            user: { id: 'u1' },
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            locale: 'en-GB',
            guildLocale: 'de',
            memberPermissions: null,
            appPermissions: { bitfield: 64n }
        } as unknown as ButtonInteraction<'cached'>;
        // the builder never reads core
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core, dispatch);

        expect(built.kind).toBe('interaction');
        expect(built.interaction).toBe(interaction);
        expect(built.dispatch).toBe(dispatch);
        expect(built.userId).toBe('u1');
        expect(built.guildId).toBe('g1');
        expect(built.channelId).toBe('c1');
        expect(built.userLocale).toBe('en-GB');
        expect(built.guildLocale).toBe('de');
        expect(built.memberRoleIds).toEqual([]);
        expect(built.memberPermissions).toBeNull();
        expect(built.appPermissions).toBe(64n);
        expect(built.memberGuildPermissions).toBeNull();
        expect(built.appGuildPermissions).toBe(0n);
    });

    it('reads role ids and channel-scoped permissions from a cached member', () => {
        const member = fakeMember(['r1', 'r2'], 8n);
        const interaction = {
            user: { id: 'u1' },
            member,
            guild: { members: { me: fakeMember([], 2n) } },
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: { bitfield: 16n },
            appPermissions: { bitfield: 64n }
        } as unknown as ButtonInteraction<'cached'>;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core, dispatch);

        expect(built.member).toBe(member);
        expect(built.memberRoleIds).toEqual(['r1', 'r2']);
        // gates read the same bits on every transport because these are the payload's channel-scoped permissions
        expect(built.memberPermissions).toBe(16n);
        expect(built.appPermissions).toBe(64n);
        expect(built.memberGuildPermissions).toBe(8n);
        expect(built.appGuildPermissions).toBe(2n);
    });

    it('excludes the everyone role from a cached member, matching the raw payload shape', () => {
        // the everyone role's id equals the guild id, and the raw payload's roles array never has it
        const member = fakeMember(['g1', 'r1'], 8n);
        const interaction = {
            user: { id: 'u1' },
            member,
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: null,
            appPermissions: { bitfield: 0n }
        } as unknown as ButtonInteraction<'cached'>;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core, dispatch);

        expect(built.memberRoleIds).toEqual(['r1']);
    });

    it('reads role ids off an uncached raw member', () => {
        const interaction = {
            user: { id: 'u1' },
            member: { roles: ['r3'] },
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: null,
            appPermissions: { bitfield: 0n }
        } as unknown as ButtonInteraction;
        const core = {} as unknown as Core;

        const built = interactionGateContext(interaction, core, dispatch);

        expect(built.member).toBeNull();
        expect(built.memberRoleIds).toEqual(['r3']);
        // the base set is null since an uncached raw member doesn't carry djs permissions
        expect(built.memberGuildPermissions).toBeNull();
    });
});

describe('eventGateContext', () => {
    it('builds the event context and yields a null actor when the args are missing a carrier', () => {
        // deriveEventActor doesn't find a Message, GuildMember, or User to read. the payload is empty
        const payload = [] as unknown as Parameters<typeof eventGateContext>[1];
        // the builder never reads core
        const core = {} as unknown as Core;

        const built = eventGateContext('messageCreate', payload, core, dispatch);

        expect(built.kind).toBe('event');
        expect(built.eventName).toBe('messageCreate');
        expect(built.dispatch).toBe(dispatch);
        expect(built.payload).toBe(payload);
        expect(built.user).toBeNull();
        expect(built.guild).toBeNull();
        expect(built.member).toBeNull();
        expect(built.userId).toBeNull();
        expect(built.guildId).toBeNull();
        expect(built.channelId).toBeNull();
        expect(built.userLocale).toBeNull();
        expect(built.guildLocale).toBeNull();
        expect(built.memberRoleIds).toEqual([]);
        expect(built.memberPermissions).toBeNull();
        expect(built.memberGuildPermissions).toBeNull();
        expect(built.appGuildPermissions).toBeNull();
    });

    it('derives the scalars from a member-carrying payload', () => {
        // the cache has the everyone role (id equals the guild id), the scalar set excludes it
        const member = fakeMember(['g1', 'r1'], 4n);
        Object.defineProperties(member, {
            guild: { value: { id: 'g1', preferredLocale: 'fr', members: { me: fakeMember([], 2n) } } },
            user: { value: { id: 'u1' } }
        });
        const payload = [member] as unknown as Parameters<typeof eventGateContext>[1];
        const core = {} as unknown as Core;

        const built = eventGateContext('guildMemberAdd', payload, core, dispatch);

        expect(built.userId).toBe('u1');
        expect(built.guildId).toBe('g1');
        expect(built.userLocale).toBeNull();
        expect(built.guildLocale).toBe('fr');
        expect(built.memberRoleIds).toEqual(['r1']);
        // these are the member's guild-level bits because events don't have a channel scope
        expect(built.memberPermissions).toBe(4n);
        expect(built.memberGuildPermissions).toBe(4n);
        expect(built.appGuildPermissions).toBe(2n);
    });

    it('reads the actor off the edited message when the old one is an authorless partial', () => {
        // partial, guild and member are getters on the real prototype
        function message(author: User | null): Message {
            return Object.defineProperties(Object.create(Message.prototype) as Message, {
                author: { value: author },
                content: { value: author ? 'hi' : null },
                guild: { value: null },
                member: { value: null },
                channelId: { value: 'c1' }
            });
        }
        const author = { id: 'b1', bot: true } as User;
        const payload = [message(null), message(author)] as unknown as Parameters<typeof eventGateContext>[1];

        const built = eventGateContext('messageUpdate', payload, {} as unknown as Core, dispatch);

        expect(built.user).toBe(author);

        const deleted = [message(null)] as unknown as Parameters<typeof eventGateContext>[1];
        expect(eventGateContext('messageDelete', deleted, {} as unknown as Core, dispatch).channelId).toBe('c1');
    });

    const guild = { id: 'g1', preferredLocale: 'fr', members: { me: null } };

    function reaction(): MessageReaction {
        return Object.defineProperties(Object.create(MessageReaction.prototype) as MessageReaction, {
            message: { value: { guild, channelId: 'c1' } }
        });
    }

    it('reads the guild and channel off a reaction and the user off the next argument', () => {
        const user = Object.defineProperties(Object.create(User.prototype) as User, { id: { value: 'u1' } });
        const payload = [reaction(), user, {}] as unknown as Parameters<typeof eventGateContext>[1];

        const built = eventGateContext('messageReactionAdd', payload, {} as unknown as Core, dispatch);

        expect(built).toMatchObject({ userId: 'u1', guildId: 'g1', channelId: 'c1', guildLocale: 'fr' });
    });

    it('reads the guild and channel off a reaction event without a user', () => {
        const payload = [reaction()] as unknown as Parameters<typeof eventGateContext>[1];

        const built = eventGateContext('messageReactionRemoveEmoji', payload, {} as unknown as Core, dispatch);

        expect(built).toMatchObject({ userId: null, guildId: 'g1', channelId: 'c1' });
    });

    it('reads a voice update off the new state', () => {
        const member = fakeMember([], 0n);
        Object.defineProperties(member, { user: { value: { id: 'u1' } } });
        const state = (channelId: string | null): VoiceState =>
            Object.defineProperties(Object.create(VoiceState.prototype) as VoiceState, {
                guild: { value: guild },
                channelId: { value: channelId },
                member: { value: member }
            });
        const payload = [state(null), state('c2')] as unknown as Parameters<typeof eventGateContext>[1];

        const built = eventGateContext('voiceStateUpdate', payload, {} as unknown as Core, dispatch);

        expect(built).toMatchObject({ userId: 'u1', guildId: 'g1', channelId: 'c2', member });
    });
});

describe('core permission gate over a djs-built context', () => {
    // pins the field wiring from a djs interaction through interactionGateContext to a core gate's check
    function contextFor(channelPerms: bigint): ReturnType<typeof interactionGateContext> {
        const interaction = {
            user: { id: 'u1' },
            member: fakeMember(['r1'], channelPerms),
            guild: null,
            guildId: 'g1',
            channelId: 'c1',
            memberPermissions: { bitfield: channelPerms },
            appPermissions: { bitfield: 0n }
        } as unknown as ButtonInteraction<'cached'>;
        return interactionGateContext(interaction, {} as unknown as Core, dispatch);
    }

    it('passes when the member holds the scoped channel permission', async () => {
        await expect(
            RequirePermissions([PermissionFlagsBits.BanMembers]).check(contextFor(PermissionFlagsBits.BanMembers))
        ).resolves.toBeUndefined();
    });

    it("refuses when the member doesn't have it", async () => {
        await expect(
            RequirePermissions([PermissionFlagsBits.BanMembers]).check(contextFor(PermissionFlagsBits.SendMessages))
        ).rejects.toThrow('A required permission is missing.');
    });
});
