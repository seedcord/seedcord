import { describe, expect, expectTypeOf, it } from 'vitest';

import type { TypedOptions } from '@interfaces/TypedOptions';
import type {
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIRole,
    Attachment,
    GuildBasedChannel,
    GuildMember,
    Role,
    User
} from 'discord.js';

// Compile-time spec for the rich-kind and cache-variant surface of TypedOptions. The assertions live in
// functions the typecheck validates but vitest never runs, so each @ts-expect-error fails the build if the
// guard it describes stops being an error. Routes are distinct from the other type-test files because every
// declare-module augmentation in the package merges during one tc run.
declare module '@seedcord/types' {
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
    }
}

function purgeRequired(options: TypedOptions<'purge'>): void {
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

function purgeOptional(options: TypedOptions<'purgeOpt'>): void {
    expectTypeOf(options.getString('label')).toEqualTypeOf<string | null>();
    expectTypeOf(options.getUser('who')).toEqualTypeOf<User | null>();
    expectTypeOf(options.getChannel('where')).toEqualTypeOf<GuildBasedChannel | null>();
    expectTypeOf(options.getRole('what')).toEqualTypeOf<Role | null>();
    expectTypeOf(options.getMentionable('anyone')).toEqualTypeOf<GuildMember | Role | User | null>();
    expectTypeOf(options.getAttachment('file')).toEqualTypeOf<Attachment | null>();
}

function auditStringChoices(options: TypedOptions<'audit'>): void {
    expectTypeOf(options.getString('mode')).toEqualTypeOf<'fast' | 'deep'>();
    expectTypeOf(options.getString('mode')).not.toEqualTypeOf<string>();
}

function auditIntegerChoices(options: TypedOptions<'audit'>): void {
    expectTypeOf(options.getInteger('level')).toEqualTypeOf<1 | 2 | 3>();
    expectTypeOf(options.getInteger('level')).not.toEqualTypeOf<number>();
}

function memberAlwaysNullable(options: TypedOptions<'purge'>): void {
    expectTypeOf(options.getMember('who')).toEqualTypeOf<GuildMember | null>();
    expectTypeOf(options.getMember('who')).not.toEqualTypeOf<GuildMember>();
}

function channelIsWide(options: TypedOptions<'purge'>): void {
    expectTypeOf(options.getChannel('where')).toEqualTypeOf<GuildBasedChannel>();
    // the typed getChannel takes only the name, no channelTypes second arg
    // @ts-expect-error getChannel accepts only the option name, not a channelTypes argument
    void options.getChannel('where', []);
}

function rawCacheVariant(options: TypedOptions<'report', 'raw'>): void {
    expectTypeOf(options.getUser('who')).toEqualTypeOf<User>();
    expectTypeOf(options.getChannel('where')).toEqualTypeOf<APIInteractionDataResolvedChannel>();
    expectTypeOf(options.getRole('what')).toEqualTypeOf<APIRole>();
    expectTypeOf(options.getMember('who')).toEqualTypeOf<APIInteractionDataResolvedGuildMember | null>();
    expectTypeOf(options.getMentionable('anyone')).toEqualTypeOf<
        APIInteractionDataResolvedGuildMember | APIRole | User
    >();
}

function mentionableHasMemberArm(options: TypedOptions<'purge'>): void {
    expectTypeOf(options.getMentionable('anyone')).extract<GuildMember>().toEqualTypeOf<GuildMember>();
    expectTypeOf(options.getMentionable('anyone')).not.toEqualTypeOf<Role | User>();
    expectTypeOf(options.getUser('who')).not.toEqualTypeOf<GuildMember | Role | User>();
}

function onlyPresentKindGetters(options: TypedOptions<'flag'>): void {
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

function unknownNameRejected(options: TypedOptions<'purge'>): void {
    // @ts-expect-error 'nope' is not an option on this route
    void options.getUser('nope');
    // @ts-expect-error 'nope' is not an option on this route
    void options.getString('nope');
    // @ts-expect-error 'nope' is not an option on this route
    void options.getChannel('nope');
}

function wrongKindRejected(options: TypedOptions<'purge'>): void {
    // @ts-expect-error 'who' is a user option, not a string option
    void options.getString('who');
    // @ts-expect-error 'label' is a string option, not a user option
    void options.getUser('label');
    // @ts-expect-error 'where' is a channel option, not a role option
    void options.getRole('where');
    // @ts-expect-error 'who' is a user option, not a channel option
    void options.getChannel('who');
}

describe('TypedOptions rich kinds and cache variants', () => {
    it('exposes the type-checked rich-option surface', () => {
        expect(typeof purgeRequired).toBe('function');
        expect(typeof purgeOptional).toBe('function');
        expect(typeof auditStringChoices).toBe('function');
        expect(typeof auditIntegerChoices).toBe('function');
        expect(typeof memberAlwaysNullable).toBe('function');
        expect(typeof channelIsWide).toBe('function');
        expect(typeof rawCacheVariant).toBe('function');
        expect(typeof mentionableHasMemberArm).toBe('function');
        expect(typeof onlyPresentKindGetters).toBe('function');
        expect(typeof unknownNameRejected).toBe('function');
        expect(typeof wrongKindRejected).toBe('function');
    });
});
