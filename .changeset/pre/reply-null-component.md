---
'@seedcord/core': patch
---

Fixed a `null` or `undefined` entry in a reply's `components` crashing with a bare `TypeError`. It now throws seedcord's serialization error with the entry's index, like any other bad component.
