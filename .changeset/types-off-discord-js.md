---
'@seedcord/types': minor
---

**BREAKING:** `@seedcord/types` no longer depends on discord.js. `ReplyResponse` and its parts are structural types over `discord-api-types`.

**BREAKING:** `files` entries take `{ attachment: Buffer | string; name?; description? }`. A discord.js `AttachmentBuilder`, `Attachment`, or a node `Stream` no longer assigns.
