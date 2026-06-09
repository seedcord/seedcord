import type { OptionKind, SlashOptionRegistry } from '@seedcord/types';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';
import type { Promisable } from 'type-fest';

type Row<Route extends keyof SlashOptionRegistry> = SlashOptionRegistry[Route];

// distributes over a union Route so a multi-command handler sees the union of every command's autocompletable
// fields. keyof a union row would intersect to only the names common to all commands instead.
type AutocompletableNames<Route extends keyof SlashOptionRegistry> = Route extends unknown
    ? {
          [Name in keyof Row<Route>]: Row<Route>[Name] extends { autocomplete: true } ? Name : never;
      }[keyof Row<Route>]
    : never;

// the registry entry for one field name, gathered across every registered command that declares it.
type EntryFor<Route extends keyof SlashOptionRegistry, Name extends PropertyKey> = Route extends unknown
    ? Name extends keyof Row<Route>
        ? Row<Route>[Name]
        : never
    : never;

// the choice value Discord expects for an autocompletable option, string for a string option and number for
// an integer or number option. distributes over a mixed-kind union to widen to string | number.
type ChoiceValueOf<Entry> = Entry extends { kind: 'string' }
    ? string
    : Entry extends { kind: 'integer' | 'number' }
      ? number
      : never;

/** The focused option. `value` is the raw partial Discord delivers mid-type, always a string regardless of kind. */
export interface FocusedField<Route extends keyof SlashOptionRegistry> {
    name: AutocompletableNames<Route>;
    value: string;
}

/** One arm per autocompletable field, `value` is the focused partial, `respond` is pinned to the field's choice type. */
export type FocusedArms<Route extends keyof SlashOptionRegistry, Ret> = {
    [Name in AutocompletableNames<Route>]: (
        value: string,
        respond: (
            choices: readonly ApplicationCommandOptionChoiceData<ChoiceValueOf<EntryFor<Route, Name>>>[]
        ) => Promise<void>
    ) => Promisable<Ret>;
};

// option names of a kind across a union Route, distributed to the union rather than the intersection.
type NamesOfKind<Route extends keyof SlashOptionRegistry, Kind extends OptionKind> = Route extends unknown
    ? {
          [Name in keyof Row<Route>]: Row<Route>[Name] extends { kind: Kind } ? Name : never;
      }[keyof Row<Route>]
    : never;

// the resolved sibling value, choices narrow to their literal union.
type ResolvedValue<Entry> = Entry extends { choices: readonly (infer Choice)[] }
    ? Choice
    : Entry extends { kind: 'string' }
      ? string
      : Entry extends { kind: 'integer' | 'number' }
        ? number
        : Entry extends { kind: 'boolean' }
          ? boolean
          : never;

// a sibling getter for one kind, present only when a registered command has an option of that kind. every read
// is nullable because a sibling is partial while the user types the focused field.
type Getter<Route extends keyof SlashOptionRegistry, Kind extends OptionKind, Method extends string> = [
    NamesOfKind<Route, Kind>
] extends [never]
    ? unknown
    : Record<
          Method,
          <Name extends NamesOfKind<Route, Kind>>(name: Name) => ResolvedValue<EntryFor<Route, Name>> | null
      >;

/**
 * The sibling-option view for an autocomplete handler. Only the four kinds Discord resolves during autocomplete
 * appear (string, integer, number, boolean), every read is `T | null` because a sibling is partial while the
 * user types the focused field, and a getter appears only when a registered command has an option of that kind.
 * Across several registered commands the view is the union of their options, so a getter for an option absent on
 * the firing command returns null. Read the focused field from `this.focused`.
 *
 * @typeParam Route - One or more route keys from {@link SlashOptionRegistry}.
 */
export type AutocompleteOptions<Route extends keyof SlashOptionRegistry> = Getter<Route, 'string', 'getString'> &
    Getter<Route, 'integer', 'getInteger'> &
    Getter<Route, 'number', 'getNumber'> &
    Getter<Route, 'boolean', 'getBoolean'>;
