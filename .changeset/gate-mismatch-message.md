---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed the compile error for a gate attached to a handler it doesn't fit. A gate typed with `InteractionGateContext` now prints one message, where it printed one per interaction kind and one of them read "requires a an interaction handler".
