# no-djs-builder-import

Disallow importing component builders from discord.js. Import them from @discordjs/builders.

`discord.js` re-exports its own CJS copy of the component builders (`EmbedBuilder`, `ButtonBuilder`, `ContainerBuilder`, and the rest). When one of those is nested inside a seedcord component, which pulls the builders from `@discordjs/builders` (ESM), the two copies are different classes. `instanceof` returns false and `toJSON` misbehaves. Import the builders from `@discordjs/builders`.

This rule covers every way the discord.js copy can enter a module:

- a named import, aliased or not
- a namespace import used as `Djs.EmbedBuilder`
- a re-export (`export { EmbedBuilder } from 'discord.js'` or `export * from 'discord.js'`)
- a `require('discord.js')` destructure or member access
- a dynamic `import('discord.js')` destructure or member access

A type-only import is erased before runtime, so it is not flagged.

## Incorrect

```ts
import { EmbedBuilder } from 'discord.js';
import * as Djs from 'discord.js';
const button = new Djs.ButtonBuilder();
```

## Correct

```ts
import { EmbedBuilder } from '@discordjs/builders';
import type { Interaction } from 'discord.js';
```
