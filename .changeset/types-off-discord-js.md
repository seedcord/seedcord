---
'@seedcord/types': minor
---

**BREAKING:** `@seedcord/types` no longer depends on discord.js. `ReplyResponse` and its parts are structural types over `discord-api-types`.

**BREAKING:** `ReplyFile` is now `{ data: Uint8Array; name: string; description?; title? }`, which sends on either transport. the Gateway transport does still accept Djs' `AttachmentBuilder` though.
