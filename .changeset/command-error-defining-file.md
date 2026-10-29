---
'seedcord': patch
---

Fixed the seedcord CLI mentioning a barrel file when a command's constructor throws, if the barrel re-exports a command defined in another file. The error now points at the file that defines the command.
