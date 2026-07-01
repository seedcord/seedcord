---
'@seedcord/types': minor
---

Make `ReplyResponse` djs-free. `V2Component`, `ReplyFile`, and the new `ReplyAllowedMentions` are structural types backed by `discord-api-types`, so the reply types no longer import `discord.js`.

**BREAKING:** `files` now takes only `{ attachment: Buffer | string; name?; description? }`. A discord.js `AttachmentBuilder` or `Attachment`, or a node `Stream`, no longer assigns, so pass the plain object instead.
