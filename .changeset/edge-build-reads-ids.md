---
'seedcord': minor
---

`seedcord build` now reads the public key, command ids and emoji ids from Discord with `DISCORD_BOT_TOKEN` and writes them into an edge worker. A command in your code with no deployed id stops the build and lists the command with its file.
