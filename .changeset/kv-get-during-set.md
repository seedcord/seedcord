---
'@seedcord/core': patch
---

Fixed `kv.get()` and `entries()` throwing `Unexpected end of JSON input` when they read a key while the same process was writing it through unstorage's fs driver.
