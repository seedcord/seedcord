# prefer-ephemeral-flag

Disallow the deprecated `ephemeral` reply option in favor of `MessageFlags.Ephemeral`.

discord.js 14 deprecated the `ephemeral` option on `reply`, `deferReply`, and `followUp`. Pass `flags: MessageFlags.Ephemeral` instead.

The fix rewrites `ephemeral: true` to `flags: MessageFlags.Ephemeral`, but only when `MessageFlags` is already imported and the options object has no `flags` key or spread, so it never produces a broken reference. Every other case is flagged without a fix.

## Incorrect

```ts
interaction.reply({ content: 'hi', ephemeral: true });
```

## Correct

```ts
interaction.reply({ content: 'hi', flags: MessageFlags.Ephemeral });
```
