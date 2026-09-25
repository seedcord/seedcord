---
'seedcord': patch
---

Fixed `seedcord dev` failing with `Cannot read properties of undefined (reading 'setChannel')` when the bot attaches a plugin published outside the `@seedcord` scope. The dev runtime now loads that plugin through the same `@seedcord/core` as the bot.
