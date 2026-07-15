import type { OptionLens } from '@inputs/OptionLens';
import type { OptionKind, SlashOptionRegistry } from '@registries/SlashOptionRegistry';
import type { ChannelType } from 'discord-api-types/v10';
import type { IsNever } from 'type-fest';

type Row<Route extends keyof SlashOptionRegistry> = SlashOptionRegistry[Route];

type NamesOfKind<Route extends keyof SlashOptionRegistry, Kind extends OptionKind> = {
    [Name in keyof Row<Route>]: Row<Route>[Name] extends { kind: Kind } ? Name : never;
}[keyof Row<Route>];

// PublicThreadChannel.type is PublicThread | AnnouncementThread, so requesting one alone Extracts to never. widen to both.
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
    Route extends keyof SlashOptionRegistry,
    Lens extends OptionLens,
    Kind extends OptionKind,
    Method extends string
> =
    IsNever<NamesOfKind<Route, Kind>> extends true
        ? unknown
        : Record<Method, <Name extends NamesOfKind<Route, Kind>>(name: Name) => Returned<Lens, Row<Route>[Name]>>;

type MemberGetter<Route extends keyof SlashOptionRegistry, Lens extends OptionLens> =
    IsNever<NamesOfKind<Route, 'user'>> extends true
        ? unknown
        : { getMember: <Name extends NamesOfKind<Route, 'user'>>(name: Name) => Lens['member'] | null };

export type SlashOptions<Route extends keyof SlashOptionRegistry, Lens extends OptionLens> = Getter<
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
