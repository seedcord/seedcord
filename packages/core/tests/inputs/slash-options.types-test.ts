import { expectTypeOf } from 'vitest';

import type { OptionLens, SlashOptions } from '#src/internal.index';

interface StubUser {
    id: string;
    username: string;
}
interface StubMember {
    roles: string[];
}
interface StubText {
    id: string;
    type: 0;
}
interface StubVoice {
    id: string;
    type: 2;
}
interface StubNews {
    id: string;
    type: 5;
}
interface StubRole {
    id: string;
    name: string;
}
interface StubAttachment {
    url: string;
}

interface StubLens extends OptionLens {
    user: StubUser;
    member: StubMember;
    channel: StubText | StubVoice | StubNews;
    role: StubRole;
    mentionable: StubUser | StubMember | StubRole;
    attachment: StubAttachment;
}

declare module '#registries/SlashRegistry' {
    interface SlashRegistry {
        coreReq: {
            options: {
                who: { kind: 'user'; required: true };
                what: { kind: 'role'; required: true };
                anyone: { kind: 'mentionable'; required: true };
                file: { kind: 'attachment'; required: true };
                count: { kind: 'integer'; required: true };
                ratio: { kind: 'number'; required: true };
                silent: { kind: 'boolean'; required: true };
                label: { kind: 'string'; required: true };
            };
            cache: 'cached';
        };
        coreOpt: {
            options: {
                who: { kind: 'user'; required: false };
                label: { kind: 'string'; required: false };
            };
            cache: 'cached';
        };
        coreChoices: {
            options: {
                mode: { kind: 'string'; required: true; choices: ['fast', 'deep'] };
                level: { kind: 'integer'; required: true; choices: [1, 2, 3] };
            };
            cache: 'cached';
        };
        coreChannels: {
            options: {
                dest: { kind: 'channel'; required: true; channelTypes: [0] };
                some: { kind: 'channel'; required: false; channelTypes: [0, 5] };
                any: { kind: 'channel'; required: true };
            };
            cache: 'cached';
        };
        coreScalarOnly: {
            options: {
                reason: { kind: 'string'; required: true };
            };
            cache: 'cached';
        };
    }
}

function requiredKinds(o: SlashOptions<'coreReq', StubLens>): void {
    expectTypeOf(o.getString('label')).toEqualTypeOf<string>();
    expectTypeOf(o.getInteger('count')).toEqualTypeOf<number>();
    expectTypeOf(o.getNumber('ratio')).toEqualTypeOf<number>();
    expectTypeOf(o.getBoolean('silent')).toEqualTypeOf<boolean>();
    expectTypeOf(o.getUser('who')).toEqualTypeOf<StubUser>();
    expectTypeOf(o.getRole('what')).toEqualTypeOf<StubRole>();
    expectTypeOf(o.getMentionable('anyone')).toEqualTypeOf<StubUser | StubMember | StubRole>();
    expectTypeOf(o.getAttachment('file')).toEqualTypeOf<StubAttachment>();
    expectTypeOf(o.getMember('who')).toEqualTypeOf<StubMember | null>();
    expectTypeOf(o.getMember('who')).not.toEqualTypeOf<StubMember>();
}

function optionalKinds(o: SlashOptions<'coreOpt', StubLens>): void {
    expectTypeOf(o.getUser('who')).toEqualTypeOf<StubUser | null>();
    expectTypeOf(o.getString('label')).toEqualTypeOf<string | null>();
}

function choiceKinds(o: SlashOptions<'coreChoices', StubLens>): void {
    expectTypeOf(o.getString('mode')).toEqualTypeOf<'fast' | 'deep'>();
    expectTypeOf(o.getInteger('level')).toEqualTypeOf<1 | 2 | 3>();
}

function channelNarrowing(o: SlashOptions<'coreChannels', StubLens>): void {
    expectTypeOf(o.getChannel('dest')).toEqualTypeOf<StubText>();
    expectTypeOf(o.getChannel('some')).toEqualTypeOf<StubText | StubNews | null>();
    expectTypeOf(o.getChannel('any')).toEqualTypeOf<StubText | StubVoice | StubNews>();
}

function onlyPresentKinds(o: SlashOptions<'coreScalarOnly', StubLens>): void {
    expectTypeOf(o.getString('reason')).toEqualTypeOf<string>();
    // @ts-expect-error no user option, so getUser is absent
    void o.getUser;
    // @ts-expect-error no channel option, so getChannel is absent
    void o.getChannel;
    // @ts-expect-error no integer option, so getInteger is absent
    void o.getInteger;
}

function unknownAndWrongKind(o: SlashOptions<'coreReq', StubLens>): void {
    // @ts-expect-error 'nope' is absent from this route
    void o.getUser('nope');
    // @ts-expect-error getString rejects the user option 'who'
    void o.getString('who');
}

// a union route is the safe intersection view: only names shared across every route with one kind,
// required only when required everywhere. per-route getters come from match's per-arm narrowing.
function unionRouteIntersects(o: SlashOptions<'coreReq' | 'coreOpt', StubLens>): void {
    // 'who' is a user option on both routes, required on one, nullable on the union
    expectTypeOf(o.getUser('who')).toEqualTypeOf<StubUser | null>();
    expectTypeOf(o.getString('label')).toEqualTypeOf<string | null>();
    // 'count' is on coreReq only, absent from the union view
    // @ts-expect-error getInteger is absent, no shared integer option
    void o.getInteger;
    // @ts-expect-error 'what' is on coreReq only
    void o.getRole;
}

// the assertions are type-level, tc is the gate that checks them

void requiredKinds;
void optionalKinds;
void choiceKinds;
void channelNarrowing;
void onlyPresentKinds;
void unknownAndWrongKind;
void unionRouteIntersects;
