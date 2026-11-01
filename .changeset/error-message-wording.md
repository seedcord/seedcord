---
'@seedcord/errors': patch
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/logger': patch
'seedcord': patch
---

Reworded error messages and log lines that joined their parts with the wrong word or read two ways. The gate mismatch compile error now reads like `needs a handler of kind Slash, but this handler's kind is Button`.
