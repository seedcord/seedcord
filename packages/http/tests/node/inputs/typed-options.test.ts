import { describe, expect, expectTypeOf, it } from 'vitest';

import type { SlashOptions } from '@inputs/SlashOptions';
import type {
    APIAttachment,
    APIInteractionDataResolvedGuildMember,
    APIRole,
    APIUser,
    ChannelType
} from 'discord-api-types/v10';

// functions are typechecked and never run
declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        httpPurge: {
            who: { kind: 'user'; required: true };
            what: { kind: 'role'; required: true };
            anyone: { kind: 'mentionable'; required: true };
            file: { kind: 'attachment'; required: true };
            label: { kind: 'string'; required: false };
        };
        httpAudit: {
            mode: { kind: 'string'; required: true; choices: ['fast', 'deep'] };
        };
        httpMove: {
            dest: { kind: 'channel'; required: true; channelTypes: [0] };
            hall: { kind: 'channel'; required: false; channelTypes: [0, 5] };
            thread: { kind: 'channel'; required: true; channelTypes: [11] };
        };
        httpFlag: {
            reason: { kind: 'string'; required: true };
        };
    }
}

function richKinds(options: SlashOptions<'httpPurge'>): void {
    expectTypeOf(options.getUser('who')).toEqualTypeOf<APIUser>();
    expectTypeOf(options.getRole('what')).toEqualTypeOf<APIRole>();
    expectTypeOf(options.getMentionable('anyone')).toEqualTypeOf<
        APIUser | APIInteractionDataResolvedGuildMember | APIRole
    >();
    expectTypeOf(options.getAttachment('file')).toEqualTypeOf<APIAttachment>();
    expectTypeOf(options.getString('label')).toEqualTypeOf<string | null>();
    expectTypeOf(options.getMember('who')).toEqualTypeOf<APIInteractionDataResolvedGuildMember | null>();
    expectTypeOf(options.getMember('who')).not.toEqualTypeOf<APIInteractionDataResolvedGuildMember>();
}

function choices(options: SlashOptions<'httpAudit'>): void {
    expectTypeOf(options.getString('mode')).toEqualTypeOf<'fast' | 'deep'>();
}

function channelNarrowing(options: SlashOptions<'httpMove'>): void {
    expectTypeOf(options.getChannel('dest').type).toEqualTypeOf<ChannelType.GuildText>();
    expectTypeOf<NonNullable<ReturnType<typeof options.getChannel<'hall'>>>['type']>().toEqualTypeOf<
        ChannelType.GuildText | ChannelType.GuildAnnouncement
    >();
    expectTypeOf(options.getChannel('thread').thread_metadata).not.toBeNever();
    expectTypeOf(options.getChannel('thread').type).toEqualTypeOf<
        ChannelType.PublicThread | ChannelType.AnnouncementThread
    >();
}

function onlyPresentKinds(options: SlashOptions<'httpFlag'>): void {
    expectTypeOf(options.getString('reason')).toEqualTypeOf<string>();
    // @ts-expect-error no user option, so getUser is absent
    void options.getUser;
    // @ts-expect-error no channel option, so getChannel is absent
    void options.getChannel;
}

function unknownAndWrongKind(options: SlashOptions<'httpPurge'>): void {
    // @ts-expect-error 'nope' is absent from this route
    void options.getUser('nope');
    // @ts-expect-error getString rejects the user option 'who'
    void options.getString('who');
}

describe('http SlashOptions view', () => {
    it('exposes the type-checked option surface over api-types leaves', () => {
        expect(typeof richKinds).toBe('function');
        expect(typeof choices).toBe('function');
        expect(typeof channelNarrowing).toBe('function');
        expect(typeof onlyPresentKinds).toBe('function');
        expect(typeof unknownAndWrongKind).toBe('function');
    });
});
