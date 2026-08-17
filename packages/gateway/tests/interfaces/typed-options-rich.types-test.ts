import { expectTypeOf } from 'vitest';

import type { SlashOptions } from '#inputs/SlashOptions';
import type {
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIRole,
    Attachment,
    GuildBasedChannel,
    GuildMember,
    NewsChannel,
    Role,
    TextChannel,
    User
} from 'discord.js';

// functions are typechecked but never run. routes are distinct from the other type-test files because all declare-module augmentations merge during one tc run
declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        purge: {
            who: { kind: 'user'; required: true };
            where: { kind: 'channel'; required: true };
            what: { kind: 'role'; required: true };
            anyone: { kind: 'mentionable'; required: true };
            file: { kind: 'attachment'; required: true };
            count: { kind: 'integer'; required: true };
            ratio: { kind: 'number'; required: true };
            silent: { kind: 'boolean'; required: true };
            label: { kind: 'string'; required: true };
        };
        purgeOpt: {
            who: { kind: 'user'; required: false };
            where: { kind: 'channel'; required: false };
            what: { kind: 'role'; required: false };
            anyone: { kind: 'mentionable'; required: false };
            file: { kind: 'attachment'; required: false };
            label: { kind: 'string'; required: false };
        };
        report: {
            who: { kind: 'user'; required: true };
            where: { kind: 'channel'; required: true };
            what: { kind: 'role'; required: true };
            anyone: { kind: 'mentionable'; required: true };
        };
        audit: {
            mode: { kind: 'string'; required: true; choices: ['fast', 'deep'] };
            level: { kind: 'integer'; required: true; choices: [1, 2, 3] };
        };
        flag: {
            reason: { kind: 'string'; required: true };
        };
        // codegen emits channelTypes as wire numbers (GuildText 0, GuildAnnouncement 5)
        move: {
            dest: { kind: 'channel'; required: true; channelTypes: [0] };
            hall: { kind: 'channel'; required: false; channelTypes: [0, 5] };
            any: { kind: 'channel'; required: true };
        };
    }
}

function purgeRequired(options: SlashOptions<'purge'>): void {
    expectTypeOf(options.getString('label')).toEqualTypeOf<string>();
    expectTypeOf(options.getInteger('count')).toEqualTypeOf<number>();
    expectTypeOf(options.getNumber('ratio')).toEqualTypeOf<number>();
    expectTypeOf(options.getBoolean('silent')).toEqualTypeOf<boolean>();
    expectTypeOf(options.getUser('who')).toEqualTypeOf<User>();
    expectTypeOf(options.getChannel('where')).toEqualTypeOf<GuildBasedChannel>();
    expectTypeOf(options.getRole('what')).toEqualTypeOf<Role>();
    expectTypeOf(options.getMentionable('anyone')).toEqualTypeOf<GuildMember | Role | User>();
    expectTypeOf(options.getAttachment('file')).toEqualTypeOf<Attachment>();
}

function purgeOptional(options: SlashOptions<'purgeOpt'>): void {
    expectTypeOf(options.getString('label')).toEqualTypeOf<string | null>();
    expectTypeOf(options.getUser('who')).toEqualTypeOf<User | null>();
    expectTypeOf(options.getChannel('where')).toEqualTypeOf<GuildBasedChannel | null>();
    expectTypeOf(options.getRole('what')).toEqualTypeOf<Role | null>();
    expectTypeOf(options.getMentionable('anyone')).toEqualTypeOf<GuildMember | Role | User | null>();
    expectTypeOf(options.getAttachment('file')).toEqualTypeOf<Attachment | null>();
}

function auditStringChoices(options: SlashOptions<'audit'>): void {
    expectTypeOf(options.getString('mode')).toEqualTypeOf<'fast' | 'deep'>();
    expectTypeOf(options.getString('mode')).not.toEqualTypeOf<string>();
}

function auditIntegerChoices(options: SlashOptions<'audit'>): void {
    expectTypeOf(options.getInteger('level')).toEqualTypeOf<1 | 2 | 3>();
    expectTypeOf(options.getInteger('level')).not.toEqualTypeOf<number>();
}

function memberAlwaysNullable(options: SlashOptions<'purge'>): void {
    expectTypeOf(options.getMember('who')).toEqualTypeOf<GuildMember | null>();
    expectTypeOf(options.getMember('who')).not.toEqualTypeOf<GuildMember>();
}

function channelIsWide(options: SlashOptions<'purge'>): void {
    expectTypeOf(options.getChannel('where')).toEqualTypeOf<GuildBasedChannel>();
    // @ts-expect-error getChannel accepts only the option name, not a channelTypes argument
    void options.getChannel('where', []);
}

function channelNarrowsToDeclaredTypes(options: SlashOptions<'move'>): void {
    // a declared channel_types narrows getChannel to the matching djs channel subtype
    expectTypeOf(options.getChannel('dest')).toEqualTypeOf<TextChannel>();
    expectTypeOf(options.getChannel('dest')).not.toEqualTypeOf<GuildBasedChannel>();
    // multiple declared types union their subtypes, and an optional option adds null
    expectTypeOf(options.getChannel('hall')).toEqualTypeOf<TextChannel | NewsChannel | null>();
    // an undeclared channel option keeps the wide resolver return
    expectTypeOf(options.getChannel('any')).toEqualTypeOf<GuildBasedChannel>();
}

function rawCacheVariant(options: SlashOptions<'report', 'raw'>): void {
    expectTypeOf(options.getUser('who')).toEqualTypeOf<User>();
    expectTypeOf(options.getChannel('where')).toEqualTypeOf<APIInteractionDataResolvedChannel>();
    expectTypeOf(options.getRole('what')).toEqualTypeOf<APIRole>();
    expectTypeOf(options.getMember('who')).toEqualTypeOf<APIInteractionDataResolvedGuildMember | null>();
    expectTypeOf(options.getMentionable('anyone')).toEqualTypeOf<
        APIInteractionDataResolvedGuildMember | APIRole | User
    >();
}

function mentionableHasMemberArm(options: SlashOptions<'purge'>): void {
    expectTypeOf(options.getMentionable('anyone')).extract<GuildMember>().toEqualTypeOf<GuildMember>();
    expectTypeOf(options.getMentionable('anyone')).not.toEqualTypeOf<Role | User>();
    expectTypeOf(options.getUser('who')).not.toEqualTypeOf<GuildMember | Role | User>();
}

function onlyPresentKindGetters(options: SlashOptions<'flag'>): void {
    expectTypeOf(options.getString('reason')).toEqualTypeOf<string>();
    // route has no user option, so getMember and getUser do not exist
    // @ts-expect-error getMember is absent without a user option
    void options.getMember;
    // @ts-expect-error getUser is absent without a user option
    void options.getUser;
    // @ts-expect-error getInteger is absent without an integer option
    void options.getInteger;
    // @ts-expect-error getChannel is absent without a channel option
    void options.getChannel;
    // @ts-expect-error getRole is absent without a role option
    void options.getRole;
    // @ts-expect-error getMentionable is absent without a mentionable option
    void options.getMentionable;
    // @ts-expect-error getAttachment is absent without an attachment option
    void options.getAttachment;
    // @ts-expect-error getBoolean is absent without a boolean option
    void options.getBoolean;
    // @ts-expect-error getNumber is absent without a number option
    void options.getNumber;
}

function unknownNameRejected(options: SlashOptions<'purge'>): void {
    // @ts-expect-error 'nope' is not an option on this route
    void options.getUser('nope');
    // @ts-expect-error 'nope' is not an option on this route
    void options.getString('nope');
    // @ts-expect-error 'nope' is not an option on this route
    void options.getChannel('nope');
}

function wrongKindRejected(options: SlashOptions<'purge'>): void {
    // @ts-expect-error 'who' is a user option, not a string option
    void options.getString('who');
    // @ts-expect-error 'label' is a string option, not a user option
    void options.getUser('label');
    // @ts-expect-error 'where' is a channel option, not a role option
    void options.getRole('where');
    // @ts-expect-error 'who' is a user option, not a channel option
    void options.getChannel('who');
}

void purgeRequired;
void purgeOptional;
void auditStringChoices;
void auditIntegerChoices;
void memberAlwaysNullable;
void channelIsWide;
void channelNarrowsToDeclaredTypes;
void rawCacheVariant;
void mentionableHasMemberArm;
void onlyPresentKindGetters;
void unknownNameRejected;
void wrongKindRejected;
