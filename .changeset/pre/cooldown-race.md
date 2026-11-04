---
'@seedcord/core': patch
---

Fixed a handler behind `Cooldown` running twice when two uses arrive at the same moment, like a double click. The second one now gets the refusal, unless it reaches another copy of your bot.
