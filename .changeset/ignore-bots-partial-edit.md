---
'@seedcord/gateway': patch
---

Fixed `IgnoreBots` letting a bot's message edit through when `Partials.Message` is on and discord.js hadn't cached the old message.
