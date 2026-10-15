---
'seedcord': minor
'@seedcord/errors': minor
---

**BREAKING:** `seedcord commands clean` with flags now runs without asking, even with `--apply` in CI. `--yes` is removed along with the `CliCleanApplyNeedsYes` and `CliCleanLargeBotUnconfirmed` codes.
