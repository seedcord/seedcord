---
'seedcord': minor
---

Add a typed `bot.mentions` accessor that maps each registered slash route to a clickable command mention like `</name:id>`. A command deployed to two or more guilds falls back to plain `/name` text. `setCommands` now returns the deployed command collections.
