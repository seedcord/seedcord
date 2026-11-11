---
'@seedcord/types': minor
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Added `bot.interactions.ephemeral`, the `ephemeral` value a reply uses when the call leaves it out. Set it to `false` to make your bot's replies public by default. `ReplySender` now takes that default as its last constructor argument.
