---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** Fixed `StaleCustomId` on every click of the second component when a handler lists two customIds with the same prefix. `@ButtonRoute` and the other component route decorators now throw `CoreDuplicateName` for a repeated prefix when the file loads.
