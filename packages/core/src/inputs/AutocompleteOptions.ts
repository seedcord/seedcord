import type { OptionKind, SlashOptionRegistry } from '@registries/SlashOptionRegistry';
import type { IsNever } from 'type-fest';

type Row<Route extends keyof SlashOptionRegistry> = SlashOptionRegistry[Route];

// distributes over Route so each command's row resolves independently
export type EntryFor<Route extends keyof SlashOptionRegistry, Name extends PropertyKey> = Route extends unknown
    ? Name extends keyof Row<Route>
        ? Row<Route>[Name]
        : never
    : never;

export type AutocompletableNames<Route extends keyof SlashOptionRegistry> = Route extends unknown
    ? {
          [Name in keyof Row<Route>]: Row<Route>[Name] extends { autocomplete: true } ? Name : never;
      }[keyof Row<Route>]
    : never;

export type ChoiceValueOf<Entry> = Entry extends { kind: 'string' }
    ? string
    : Entry extends { kind: 'integer' | 'number' }
      ? number
      : never;

/** The focused option. `value` is the raw partial Discord delivers mid-type, always a string regardless of kind. */
export interface FocusedField<Route extends keyof SlashOptionRegistry> {
    name: AutocompletableNames<Route>;
    value: string;
}

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

// a sibling is partial while the user types the focused field, every read is | null
export type AutocompleteOptions<Route extends keyof SlashOptionRegistry> = Getter<Route, 'string', 'getString'> &
    Getter<Route, 'integer', 'getInteger'> &
    Getter<Route, 'number', 'getNumber'> &
    Getter<Route, 'boolean', 'getBoolean'>;
