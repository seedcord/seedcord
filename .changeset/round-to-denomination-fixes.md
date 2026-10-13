---
'@seedcord/utils': patch
---

Fixed `roundToDenomination` rounding 1949 up to `2K` and printing `1undefined` for a value after the last suffix. Now 1949 gives `1.9K`, for example.
