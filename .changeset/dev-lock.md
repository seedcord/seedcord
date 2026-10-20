---
'seedcord': minor
'@seedcord/errors': minor
---

`seedcord dev` now refuses to start a second dev session on the same Discord application, like two bot folders that read the same token, and throws `CliDevAlreadyRunning`. Two sessions on one application used to overwrite each other's commands and interactions endpoint.
