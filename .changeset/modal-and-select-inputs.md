---
'@seedcord/gateway': minor
'@seedcord/errors': minor
'@seedcord/http': minor
---

Modal and select menu handlers read their inputs the same way on both transports. `this.fields` reads a modal's submitted values by custom id. A select handler carries `values` plus the resolved `users`, `members`, `roles`, and `channels` for its kind.
