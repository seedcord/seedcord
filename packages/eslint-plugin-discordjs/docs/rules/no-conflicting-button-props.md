# no-conflicting-button-props

Disallow conflicting props on a button builder.

A button cannot set both a `customId` and a `url`, and a `ButtonStyle.Link` button uses a `url` and cannot have a `customId`. Discord rejects either combination.

The rule fires on a single fluent chain. Props split across separate statements are not flagged.

## Incorrect

```ts
new ButtonBuilder().setCustomId('x').setURL('https://example.com');
new ButtonBuilder().setStyle(ButtonStyle.Link).setCustomId('x');
```

## Correct

```ts
new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId('x');
new ButtonBuilder().setStyle(ButtonStyle.Link).setURL('https://example.com');
```
