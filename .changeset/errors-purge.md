---
'@seedcord/errors': minor
---

**BREAKING:** `CliCleanPurgeAllGuilds` is removed, since `seedcord commands purge` accepts `--all-guilds`. Added `CliPurgeNoTargets` for a purge run with none of `--global`, `--guilds` or `--all-guilds`.
