# use-custom-id-codec

Disallow hand-written customId strings in `setCustomId`.

A raw string or template passed to `setCustomId` bypasses the typed `CustomId` codec, so its route and params are never encoded and a component handler decodes the wrong shape at runtime. Build the id through `CustomId.encode()` instead. An interpolated template (`` `go:${page}` ``) is the same hand-rolled dynamic id the codec exists to replace, so it is flagged too.

## Incorrect

```ts
new ButtonBuilder().setCustomId('approve');
new ButtonBuilder().setCustomId(`go:${page}`);
```

## Correct

```ts
new ButtonBuilder().setCustomId(ApproveId.encode({ userId }));
new ButtonBuilder().setCustomId(CONFIRM_IDS.confirm);
```
