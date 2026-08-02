---
'@seedcord/gateway': minor
'@seedcord/core': minor
---

**BREAKING:** the component builders are built on `@discordjs/builders`. Import any builder you nest inside a seedcord component from there too, because the copy discord.js re-exports is a separate class that breaks `instanceof`.

**BREAKING:** `ControlCosmetics.emoji` takes an `APIMessageComponentEmoji` such as `{ name: '👍' }`. A bare string no longer type-checks.
