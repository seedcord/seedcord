---
'@seedcord/gateway': minor
---

Build seedcord's component builders on `@discordjs/builders`. Import any builder you nest inside a seedcord component from `@discordjs/builders` too. The copy discord.js re-exports is a separate class that breaks `instanceof` and `toJSON`.

**BREAKING:** `ControlCosmetics.emoji` (on `PaginatorControls.button`) narrows from `ComponentEmojiResolvable` to `APIMessageComponentEmoji`. Pass an emoji object like `{ name: '👍' }`. A bare string no longer type-checks.
