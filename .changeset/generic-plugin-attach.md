---
'@seedcord/core': patch
---

Fixed `attach()` failing to compile with `'[]' is not assignable to parameter of type 'never'` for a plugin class with a type parameter, like `class Cache<T> extends Plugin`. That plugin now attaches as `Cache<unknown>`.
