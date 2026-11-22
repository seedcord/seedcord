---
'@seedcord/eslint-config': patch
---

`no-magic-numbers` no longer reports the numbers that dates and durations are made of, like `24 * 60 * 60 * 1000` for a day or `7` for a week. It now allows 7, 12, 24, 28, 30, 31, 52, 60, 365, and 366.
