---
'@seedcord/core': patch
'@seedcord/errors': patch
'seedcord': patch
---

_Kinda BREAKING:_ Starting a bot or running the CLI on a Node version below the `engines` range now throws, naming the required range and the version you are running. The floor stays at `>=24.11`.
