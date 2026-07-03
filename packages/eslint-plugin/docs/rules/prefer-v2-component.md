# prefer-v2-component

Prefer a components v2 layout over a legacy embed.

Discord's components v2 system (`ContainerBuilder`, `TextDisplayBuilder`, `SectionBuilder`, and the rest) lays out a rich message in place of an embed. This rule warns on a raw `EmbedBuilder` so new code uses that layout. An embed still works, so it is a `warn`, not an error.

The rule resolves types, so it catches an embed in either form. A raw `new EmbedBuilder()`, aliased import and all, resolves to `EmbedBuilder`. A seedcord component that exposes an `EmbedBuilder` through its `.component`, a `BuilderComponent<'embed'>` subclass, resolves the same way through the generic. A component wrapping a different builder, a container or a row, is not flagged.

## Incorrect

```ts
const embed = new EmbedBuilder().setTitle('Stats');
```

## Correct

```ts
const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## Stats')
);
```
