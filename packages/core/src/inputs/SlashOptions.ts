import type { OptionLens } from '#inputs/OptionLens';
import type { OptionKind, SlashRegistry } from '#registries/SlashRegistry';
import type { ChannelType } from 'discord-api-types/v10';
import type { IsNever } from 'type-fest';

type Row<Route extends keyof SlashRegistry> = SlashRegistry[Route]['options'];

// deliberately non-distributive because a union Route intersects to the names shared by every route, since a
// distributed union would type a required option as non-null while a route without it fired
type NamesOfKind<Route extends keyof SlashRegistry, Kind extends OptionKind> = {
    [Name in keyof Row<Route>]: Row<Route>[Name] extends { kind: Kind } ? Name : never;
}[keyof Row<Route>];

// a djs thread channel's type field is PublicThread | AnnouncementThread, requesting one alone would
// Extract to never on the gateway lens. widen to both.
type ChannelWireType<Types extends number> = Types extends ChannelType.PublicThread | ChannelType.AnnouncementThread
    ? ChannelType.PublicThread | ChannelType.AnnouncementThread
    : Types;

type ResolvedChannel<Lens extends OptionLens, Entry> = Entry extends {
    channelTypes: readonly (infer Types extends number)[];
}
    ? Extract<Lens['channel'], { type: ChannelWireType<Types> }>
    : Lens['channel'];

type ResolvedValue<Lens extends OptionLens, Entry> = Entry extends { choices: readonly (infer Choice)[] }
    ? Choice
    : Entry extends { kind: 'string' }
      ? string
      : Entry extends { kind: 'integer' | 'number' }
        ? number
        : Entry extends { kind: 'boolean' }
          ? boolean
          : Entry extends { kind: 'user' }
            ? Lens['user']
            : Entry extends { kind: 'channel' }
              ? ResolvedChannel<Lens, Entry>
              : Entry extends { kind: 'role' }
                ? Lens['role']
                : Entry extends { kind: 'mentionable' }
                  ? Lens['mentionable']
                  : Entry extends { kind: 'attachment' }
                    ? Lens['attachment']
                    : never;

type Returned<Lens extends OptionLens, Entry> = Entry extends { required: true }
    ? ResolvedValue<Lens, Entry>
    : ResolvedValue<Lens, Entry> | null;

type Getter<
    Route extends keyof SlashRegistry,
    Lens extends OptionLens,
    Kind extends OptionKind,
    Method extends string
> =
    IsNever<NamesOfKind<Route, Kind>> extends true
        ? unknown
        : Record<Method, <Name extends NamesOfKind<Route, Kind>>(name: Name) => Returned<Lens, Row<Route>[Name]>>;

type MemberGetter<Route extends keyof SlashRegistry, Lens extends OptionLens> =
    IsNever<NamesOfKind<Route, 'user'>> extends true
        ? unknown
        : { getMember: <Name extends NamesOfKind<Route, 'user'>>(name: Name) => Lens['member'] | null };

export type SlashOptions<Route extends keyof SlashRegistry, Lens extends OptionLens> = Getter<
    Route,
    Lens,
    'string',
    'getString'
> &
    Getter<Route, Lens, 'integer', 'getInteger'> &
    Getter<Route, Lens, 'number', 'getNumber'> &
    Getter<Route, Lens, 'boolean', 'getBoolean'> &
    Getter<Route, Lens, 'user', 'getUser'> &
    Getter<Route, Lens, 'channel', 'getChannel'> &
    Getter<Route, Lens, 'role', 'getRole'> &
    Getter<Route, Lens, 'mentionable', 'getMentionable'> &
    Getter<Route, Lens, 'attachment', 'getAttachment'> &
    MemberGetter<Route, Lens>;
