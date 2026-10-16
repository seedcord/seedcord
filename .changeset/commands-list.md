---
'seedcord': minor
---

Added `seedcord commands list` to print the commands Discord has globally and in every guild your code deploys to, plus any guild you pass with `--guilds` or every guild the bot is in with `--all-guilds`. It warns about a guild it cannot read and lists the rest. `--verbose` adds each command's id, and `--json` prints Discord's command objects as JSON for scripts.
