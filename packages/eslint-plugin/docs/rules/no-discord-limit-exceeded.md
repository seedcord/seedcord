# no-discord-limit-exceeded

Disallow exceeding a Discord builder limit with a statically-known number of items.

Some builders have a hard cap that Discord rejects, an action row holds 5 components, a select menu 25 options, an embed 25 fields, a slash option 25 choices. This rule counts the items only when they are all literal on a chain built from a fresh `new <Builder>()`.

It also covers the seedcord form. A `this.instance` chain inside a `RowComponent` or `BuilderComponent<'embed' | 'menu_string'>` resolves to the same cap through the class's generic.

It never fires on dynamic construction. A spread (`addComponents(...items)`), a `.map()` result, a variable passed to `setX`, a chain built on a variable receiver, or a builder that is not capped (a container) all mean the count is a runtime value, so nothing is flagged.

## Incorrect

```ts
new ActionRowBuilder().addComponents(b1, b2, b3, b4, b5, b6);
```

## Correct

```ts
new ActionRowBuilder().addComponents(...buttons);
new ActionRowBuilder().addComponents(b1, b2, b3, b4, b5);
```
