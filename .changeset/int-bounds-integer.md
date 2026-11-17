---
'@seedcord/custom-id': patch
'@seedcord/errors': patch
---

Fixed `.int()` accepting a bound that isn't an integer, which made `encode()` and `decode()` throw a raw `RangeError` instead of `CustomIdInvalidBounds`.
