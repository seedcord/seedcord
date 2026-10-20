---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord dev` now throws `CliDevAlreadyRunning` when another dev session runs a bot on the same Discord application, like two bot folders that read the same token. Two sessions on one application used to overwrite each other's commands and interactions endpoint.
