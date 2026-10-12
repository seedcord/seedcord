---
'@seedcord/utils': patch
---

Fixed `roundToDenomination` so decimals ending in `.9` stay as written, higher precision drops trailing zeroes, and results never include the text `undefined` when a value reaches the last suffix or exceeds the built-in list.
