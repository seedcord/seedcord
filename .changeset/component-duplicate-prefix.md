---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Fixed `StaleCustomId` on every click of the second component when a handler lists two customIds with the same prefix. Every route decorator now throws `DecoratorDuplicateKey` for a repeated route or prefix when the file loads.
