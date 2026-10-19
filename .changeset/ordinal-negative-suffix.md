---
'@seedcord/utils': patch
---

Fixed `ordinal` picking a negative number's suffix from its signed last two digits, so `-1` came back as `-1th` instead of `-1st`.
