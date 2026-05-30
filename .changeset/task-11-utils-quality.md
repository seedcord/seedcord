---
'@seedcord/utils': patch
---

`filterCirculars` now returns a serializable `{ '[unserializable]': reason }` placeholder when a value cannot be made JSON-safe, instead of returning the original value (which would re-throw in the caller's own `JSON.stringify`). `traverseDirectory` logs the directory path and cause on a read failure.
