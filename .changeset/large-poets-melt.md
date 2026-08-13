---
'seedcord': patch
'create-seedcord': patch
'@seedcord/errors': patch
---

_Kinda BREAKING?:_ `seedcord dev` no longer runs `tsc --watch` unless you set `hmr.typecheck`. Pass `true` for the nearest tsconfig, or `{ tsconfig }` to pick one, which replaces the old `hmr.tsconfig`.
