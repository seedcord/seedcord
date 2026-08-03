# require-button-props

Require every prop the button style must carry before the payload reaches Discord.

Each style has required props. Primary, Secondary, Success, and Danger buttons require a `customId`. A Link button requires a `url`. A Premium button requires a `skuId`. Every non-premium button also requires a label or an emoji, the builders throw at `toJSON` without one. A builder with no style at all reports too, Discord rejects a button without one.

The rule reports only when every prop the button will carry is readable from the file. The chain must start at a bare discord.js `new ButtonBuilder(...)` (constructor data counts like setters, in either key casing) with a static style, and the finished value must be sealed, meaning dropped as a statement, passed to a discord.js method like `addComponents`, or bound to a variable whose later statement chains are all readable. A builder passed to your own function, returned, aliased into another binding, reassigned, built through a subclass, copied with `.from()`, or constructed from spread data stays unflagged, later code could still add the missing prop. A variable that only feeds `ButtonBuilder.from()` is a template and skips the checks, its copies carry the completion.

An exported incomplete builder reports even though another module could import and complete it. That pattern mutates a shared instance across every importer, copy with `ButtonBuilder.from()` instead, or disable the line for a deliberate case:

```ts
// eslint-disable-next-line discordjs/require-button-props -- completed by the importer
export const btn = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x');
```

## Incorrect

```ts
new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Docs'); // no url
row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x')); // no customId
export const btn = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url); // no label or emoji
new ButtonBuilder().setLabel('x'); // no style
```

## Correct

```ts
new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel('Docs');

const b = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x');
b.setCustomId('confirm');

finish(new ButtonBuilder().setStyle(ButtonStyle.Danger)); // your function may complete it
```
