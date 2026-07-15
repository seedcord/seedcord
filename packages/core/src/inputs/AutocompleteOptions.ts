import type { OptionKind, SlashOptionRegistry } from '@registries/SlashOptionRegistry';
import type { IsNever } from 'type-fest';

type Row<Route extends keyof SlashOptionRegistry> = SlashOptionRegistry[Route];

type EntryFor<Route extends keyof SlashOptionRegistry, Name extends PropertyKey> = Route extends unknown
    ? Name extends keyof Row<Route>
        ? Row<Route>[Name]
        : never
    : never;

type NamesOfKind<Route extends keyof SlashOptionRegistry, Kind extends OptionKind> = Route extends unknown
    ? {
          [Name in keyof Row<Route>]: Row<Route>[Name] extends { kind: Kind } ? Name : never;
      }[keyof Row<Route>]
    : never;

type ResolvedValue<Entry> = Entry extends { choices: readonly (infer Choice)[] }
    ? Choice
    : Entry extends { kind: 'string' }
      ? string
      : Entry extends { kind: 'integer' | 'number' }
        ? number
        : Entry extends { kind: 'boolean' }
          ? boolean
          : never;

type Getter<Route extends keyof SlashOptionRegistry, Kind extends OptionKind, Method extends string> =
    IsNever<NamesOfKind<Route, Kind>> extends true
        ? unknown
        : Record<
              Method,
              <Name extends NamesOfKind<Route, Kind>>(name: Name) => ResolvedValue<EntryFor<Route, Name>> | null
          >;

// every read is nullable, a sibling option is partial while the focused field is still being typed.
export type AutocompleteOptions<Route extends keyof SlashOptionRegistry> = Getter<Route, 'string', 'getString'> &
    Getter<Route, 'integer', 'getInteger'> &
    Getter<Route, 'number', 'getNumber'> &
    Getter<Route, 'boolean', 'getBoolean'>;
