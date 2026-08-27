---
'@seedcord/gateway': patch
'@seedcord/http': patch
'@seedcord/errors': patch
---

A context menu handler registered for several command names runs one arm per name through `match` and reads the fired name from `commandName`. On gateway each arm receives the target narrowed to that one command's cache state.
