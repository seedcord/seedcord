---
'@seedcord/utils': patch
---

`seedcord` now reads `setCliFiles` from here, and `isPlainObject` now rejects a `Date`, a class instance, or any other object made by a constructor.
