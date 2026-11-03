---
'@seedcord/gateway': patch
---

Fixed a handler reading `Emojis` before startup filled it, when an interaction or event arrived right after login. Handlers now start in the Ready phase, and anything that arrived during Login is dispatched once Ready is complete.
