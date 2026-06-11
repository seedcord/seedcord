import type { OptionKind, SlashOptionRegistry } from '@seedcord/types';
import type { CacheType, CommandInteractionOption } from 'discord.js';
import type { IsNever } from 'type-fest';

// the option table generated for one route
type Row<Route extends keyof SlashOptionRegistry> = SlashOptionRegistry[Route];

// the option names on a route whose kind is Kind
type NamesOfKind<Route extends keyof SlashOptionRegistry, Kind extends OptionKind> = {
    [Name in keyof Row<Route>]: Row<Route>[Name] extends { kind: Kind } ? Name : never;
}[keyof Row<Route>];

// choices narrow to their literal union. rich kinds derive straight off CommandInteractionOption so they equal what the djs resolver returns
type ResolvedValue<Cache extends CacheType, Entry> = Entry extends { choices: readonly (infer Choice)[] }
    ? Choice
    : Entry extends { kind: 'string' }
      ? string
      : Entry extends { kind: 'integer' | 'number' }
        ? number
        : Entry extends { kind: 'boolean' }
          ? boolean
          : Entry extends { kind: 'user' }
            ? NonNullable<CommandInteractionOption<Cache>['user']>
            : Entry extends { kind: 'channel' }
              ? NonNullable<CommandInteractionOption<Cache>['channel']>
              : Entry extends { kind: 'role' }
                ? NonNullable<CommandInteractionOption<Cache>['role']>
                : Entry extends { kind: 'mentionable' }
                  ? NonNullable<CommandInteractionOption<Cache>['member' | 'role' | 'user']>
                  : Entry extends { kind: 'attachment' }
                    ? NonNullable<CommandInteractionOption<Cache>['attachment']>
                    : never;

// djs returns T | null on optional options, never T | undefined
type Returned<Cache extends CacheType, Entry> = Entry extends { required: true }
    ? ResolvedValue<Cache, Entry>
    : ResolvedValue<Cache, Entry> | null;

// a getter exists only when the route has at least one option of that kind, so a command without an
// integer option has no getInteger at all. unknown is the identity for intersection, so absent kinds
// contribute nothing.
type Getter<
    Route extends keyof SlashOptionRegistry,
    Cache extends CacheType,
    Kind extends OptionKind,
    Method extends string
> =
    IsNever<NamesOfKind<Route, Kind>> extends true
        ? unknown
        : Record<Method, <Name extends NamesOfKind<Route, Kind>>(name: Name) => Returned<Cache, Row<Route>[Name]>>;

// a user option also exposes getMember, which djs always types as nullable (no required overload).
type MemberGetter<Route extends keyof SlashOptionRegistry, Cache extends CacheType> =
    IsNever<NamesOfKind<Route, 'user'>> extends true
        ? unknown
        : {
              getMember: <Name extends NamesOfKind<Route, 'user'>>(
                  name: Name
              ) => NonNullable<CommandInteractionOption<Cache>['member']> | null;
          };

/**
 * The typed view over a chat-input command's options for one route. Each getter mirrors the discord.js
 * resolver method but restricts its `name` to that route's options of the matching kind, drops the null
 * on required options, narrows `choices` to their literal union, and only appears when the route has an
 * option of that kind. The rich kinds return exactly what the djs resolver returns.
 *
 * Pass the raw `this.event.options` resolver for anything this view does not cover, such as narrowing a
 * channel option with `getChannel(name, channelTypes)`.
 *
 * @typeParam Route - A route key from the generated {@link SlashOptionRegistry}.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
 */
export type SlashOptions<Route extends keyof SlashOptionRegistry, Cache extends CacheType = 'cached'> = Getter<
    Route,
    Cache,
    'string',
    'getString'
> &
    Getter<Route, Cache, 'integer', 'getInteger'> &
    Getter<Route, Cache, 'number', 'getNumber'> &
    Getter<Route, Cache, 'boolean', 'getBoolean'> &
    Getter<Route, Cache, 'user', 'getUser'> &
    Getter<Route, Cache, 'channel', 'getChannel'> &
    Getter<Route, Cache, 'role', 'getRole'> &
    Getter<Route, Cache, 'mentionable', 'getMentionable'> &
    Getter<Route, Cache, 'attachment', 'getAttachment'> &
    MemberGetter<Route, Cache>;
