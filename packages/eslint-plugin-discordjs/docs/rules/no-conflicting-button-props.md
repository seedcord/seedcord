# no-conflicting-button-props

Disallow conflicting props on a button builder.

A button cannot set both a `customId` and a `url`. A Link button takes a `url` and cannot have a `customId` or a `skuId`. The other non-premium styles take a `customId` and cannot have a `url` or a `skuId`. A Premium button takes only a `skuId` and cannot have a `customId`, `label`, `url`, or `emoji`. The builders throw a `RangeError` at `toJSON` for every one of these combinations, and `disableValidators()` skips none of them.

The rule reads a single fluent chain plus the constructor data behind it, so `new ButtonBuilder({ url })` counts the same as `.setURL(url)`, in either key casing. Props split across separate statements are not flagged, and style-specific checks only apply when the style is a static value. A `skuId` beside a `customId`, `label`, `url`, or `emoji` reports without any style, the pair throws under every style.

## Incorrect

```ts
new ButtonBuilder().setCustomId('x').setURL('https://example.com');
new ButtonBuilder().setStyle(ButtonStyle.Link).setCustomId('x');
new ButtonBuilder({ style: ButtonStyle.Danger, label: 'x' }).setURL('https://example.com');
new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId('123').setLabel('x');
```

## Correct

```ts
new ButtonBuilder().setStyle(ButtonStyle.Primary).setCustomId('x');
new ButtonBuilder().setStyle(ButtonStyle.Link).setURL('https://example.com');
new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId('123');
```
