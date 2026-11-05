---
'@seedcord/core': patch
---

Fixed `kv.get()` throwing `Unexpected end of JSON input` when it read a key while the same process was writing it through unstorage's fs driver.
