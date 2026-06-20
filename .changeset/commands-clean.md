---
'@seedcord/cli': minor
'@seedcord/errors': patch
---

Add `seedcord commands --clean` to report and, with `--apply`, delete stale or overlapping guild application commands. It reads the live deployed state over REST without logging in, dry-run by default with a typed-count confirm. Use `--guild <ids>` to target guilds, `--all-guilds` to scan every guild the bot is in, and `--purge` to clear a named guild. It never touches global commands.
