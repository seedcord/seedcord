---
'@seedcord/core': minor
'@seedcord/errors': minor
'@seedcord/types': minor
---

Renamed the shared `Symbol.for` keys to one `seedcord:` shape. Upgrade these three together, since a mixed pair stops recognizing each other's errors and components.
