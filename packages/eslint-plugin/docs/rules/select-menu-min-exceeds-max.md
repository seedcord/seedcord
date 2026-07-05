# select-menu-min-exceeds-max

Disallow a select menu whose minimum selections exceed its maximum.

Each setter validates its own range, so `setMinValues(5)` and `setMaxValues(2)` both pass alone, and the builder serializes the pair without a cross-check. A user cannot pick more than `max_values` items, so a `min_values` above it is unsatisfiable and Discord rejects the message at send.

The rule reads both bounds from a single chain on any discord.js select menu builder (they all extend `BaseSelectMenuBuilder`). A bound is a numeric literal (a cast like `5 as number` only changes the checker's view, the literal is still the runtime value) or a const whose type is a number literal, anything dynamic is not statically provable, so nothing is flagged. When a setter repeats, the last call is the one compared.

## Incorrect

```ts
new StringSelectMenuBuilder().setCustomId('pick').setMinValues(5).setMaxValues(2);
```

## Correct

```ts
new StringSelectMenuBuilder().setCustomId('pick').setMinValues(2).setMaxValues(5);
new StringSelectMenuBuilder().setCustomId('pick').setMinValues(n).setMaxValues(2);
```
