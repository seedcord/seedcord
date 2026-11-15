# no-choices-and-autocomplete

Disallow both autocomplete and choices on the same slash option.

A slash string, integer, or number option cannot both enable autocomplete and declare static choices. Setting both throws a `RangeError` when the option is built, so the command module fails to load. Keep one.

The rule reports only on a single fluent chain that has both `setAutocomplete(true)` and `addChoices(...)` or `setChoices(...)` with at least one literal choice. The autocomplete flag can be a literal or a const whose type is the literal `true`. Choices spread from a runtime array, and the two setters split across separate statements, are not flagged.

## Incorrect

```ts
new SlashCommandStringOption().setName('query').setAutocomplete(true).addChoices({ name: 'A', value: 'a' });
```

## Correct

```ts
new SlashCommandStringOption().setName('query').setAutocomplete(true);

new SlashCommandStringOption().setName('query').addChoices({ name: 'A', value: 'a' });
```
