# require-components-v2-flag

Require the IsComponentsV2 flag on a message that uses v2 builder components.

The v2 layout builders (`ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, `MediaGalleryBuilder`, `FileBuilder`, `SeparatorBuilder`, `ThumbnailBuilder`) only render when the message sets `flags: MessageFlags.IsComponentsV2`. Send one without the flag and Discord rejects the payload.

The rule reads types, so it fires only on a discord.js message-options position (a `reply`, `send`, `followUp`, or `edit` payload) once the flag is missing. A payload built in a variable resolves through the call that sends it, annotated or not. It resolves the flag from an enum member, a numeric or string value, an array, or a bitwise combination (`|`, `<<`), and from a flag supplied through a spread of an `as const` or typed object. It also walks the payload left to right, so the last flags contributor wins. Anything it cannot read statically (a variable, a computed number, a `MessageFlagsBitField`, or an inferred object spread whose flags widen to the enum) is left alone, so it never reports a payload that might already set the flag. An `ActionRowBuilder` is not a v2 builder, so it needs no flag.

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
