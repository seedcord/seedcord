# no-content-with-v2-components

Disallow content or embeds on a message that uses a components v2 builder.

A message built with the components v2 system (`ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, `MediaGalleryBuilder`, `FileBuilder`, `SeparatorBuilder`) cannot also set `content` or `embeds`. Discord rejects the payload.

This rule reads the type of each element in a `components` array. It flags the message only when one of them is a components v2 builder, so a traditional `ActionRowBuilder` alongside `content` is not flagged. A v2 component reached through a seedcord `BuilderComponent`'s `.component` getter resolves the same way.

## Incorrect

```ts
interaction.reply({ content: 'hi', components: [new ContainerBuilder()] });
interaction.reply({ embeds: [embed], components: [card.component] });
```

## Correct

```ts
interaction.reply({ components: [new ContainerBuilder()] });
interaction.reply({ content: 'hi', components: [new ActionRowBuilder()] });
```
