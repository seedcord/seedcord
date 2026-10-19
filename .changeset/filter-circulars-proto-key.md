---
'@seedcord/utils': patch
---

Fixed `filterCirculars` in `decycle` mode dropping an own `__proto__` key from a parsed payload and putting the cloned value on the copy's prototype instead.
