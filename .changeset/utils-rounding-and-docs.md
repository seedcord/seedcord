---
'@seedcord/utils': patch
---

Fixed `roundToDenomination` shortening from 10_000 up. It should have been 1_000. `1234` now correctly returns `'1.2K'` where it used to return `'1234'`. Also, this function now takes any number of `suffixes`.

Fixed `longestStringLength([])` returning `-Infinity` instead of `0`.
