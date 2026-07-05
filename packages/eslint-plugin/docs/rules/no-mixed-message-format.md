# no-mixed-message-format

Disallow a message that mixes builder components with content, embeds, poll, or stickers.

A Discord message uses one of two formats, never both: builder components (the components v2 layout, `ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, `MediaGalleryBuilder`, `FileBuilder`, `SeparatorBuilder`, `ThumbnailBuilder`), or the content fields (`content`, `embeds`, `poll`, `stickers` / `sticker_ids`). Set both on one payload and Discord rejects it.

The rule reads types, so it resolves each side wherever it comes from, an inline array, a variable, or a spread of another object. An `ActionRowBuilder` is not a v2 builder, so it can sit alongside `content`. A v2 component reached through a seedcord `BuilderComponent`'s `.component` getter resolves the same way.

## Incorrect

```ts
interaction.reply({ content: 'hi', components: [new ContainerBuilder()] });
interaction.reply({ poll, components: [card.component] });
const base = { components: [new ContainerBuilder()] };
interaction.reply({ ...base, content: 'hi' });
```

## Correct

```ts
interaction.reply({ components: [new ContainerBuilder()] });
interaction.reply({ content: 'hi', components: [new ActionRowBuilder()] });
```
