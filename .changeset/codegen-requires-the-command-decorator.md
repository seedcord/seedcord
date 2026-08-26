---
'@seedcord/core': patch
'seedcord': patch
---

`seedcord codegen` now skips a `BuilderComponent` subclass that carries no `@RegisterCommand`, matching the set your bot deploys at startup. An undecorated class previously got a route, and a handler could then typecheck against a command that never reached Discord.
