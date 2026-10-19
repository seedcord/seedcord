---
'@seedcord/utils': patch
---

Fixed `filterCirculars` in `decycle` mode replacing the whole payload with the `[unserializable]` marker when one value was a Date parsed from bad input. That value now becomes `null`, the same as `JSON.stringify`.
