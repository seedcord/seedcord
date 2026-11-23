---
'@seedcord/plugin-oauth': minor
'@seedcord/errors': patch
---

Added `@seedcord/plugin-oauth`, which logs people in with Discord and calls the API as them, like `this.core.oauth.as(userId).guilds()`. It keeps each user's tokens encrypted in your bot's `kv` and refreshes them before they expire.
