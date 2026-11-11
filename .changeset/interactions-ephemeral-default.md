---
'@seedcord/types': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Added `bot.interactions.ephemeral` to set whether replies are ephemeral when a call leaves `ephemeral` out, so `ephemeral: false` makes `reply()`, `followUp()`, `defer()`, paginators, and confirm prompts public by default. Fault replies and notices still default to ephemeral.
