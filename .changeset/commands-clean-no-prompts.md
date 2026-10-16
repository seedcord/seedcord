---
'seedcord': minor
'@seedcord/errors': minor
---

**BREAKING:** `seedcord commands clean` now deletes with `--yes` in place of `--apply`. With flags, it no longer asks before deleting. The old `--apply` and `--yes` pair is gone, along with the `CliCleanApplyNeedsYes` and `CliCleanLargeBotUnconfirmed` codes.
