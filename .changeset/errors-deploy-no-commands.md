---
'@seedcord/errors': minor
---

Added `CliDeployNoCommandsFolder` for `seedcord commands deploy` on a bot whose `commands.path` is `null`, and `CliDeployNeedsYes` for a deploy that can't ask first and has no `--yes`.
