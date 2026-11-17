---
'@seedcord/custom-id': minor
---

**BREAKING:** Fixed `.int()` accepting a bound that isn't an integer. A fractional or `NaN` bound now throws `CustomIdInvalidBounds` when the field is declared, instead of a raw `RangeError` on the first encode or decode.
