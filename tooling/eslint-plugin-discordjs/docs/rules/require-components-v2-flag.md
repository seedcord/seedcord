# require-components-v2-flag

Require the IsComponentsV2 flag on a message that uses v2 builder components.

The v2 layout builders (`ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, `MediaGalleryBuilder`, `FileBuilder`, `SeparatorBuilder`, `ThumbnailBuilder`) only render when the message sets `flags: MessageFlags.IsComponentsV2`. Send one without the flag and Discord rejects the payload.

The rule reads types. It reports only on a discord.js message-options position (a `reply`, `send`, `followUp`, or `edit` payload) once the flag is missing. A payload built in a variable resolves through the call that sends it, annotated or not, and reports once at its declaration however many sends reuse it. A subclass of a v2 builder resolves through its base chain. It resolves the flag from an enum member, a numeric or string value, an array, or a bitwise combination (`|`, `<<`). It also resolves a flag supplied through a spread of an `as const` or typed object. It walks the payload left to right, so the last flags contributor sets the flags. Anything it cannot read statically is left alone, like a variable, a computed number, a `MessageFlagsBitField`, or an inferred object spread whose flags widen to the enum. The payload might set the flag. An `ActionRowBuilder` doesn't need a flag because it is not a v2 builder.

## Incorrect

```ts
channel.send({ components: [new ContainerBuilder()] });
interaction.reply({ components: [new ContainerBuilder()], flags: MessageFlags.Ephemeral });
```

## Correct

```ts
channel.send({ components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
channel.send({ content: 'hi', components: [new ActionRowBuilder()] });
```
