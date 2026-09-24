---
'@seedcord/core': patch
'@seedcord/errors': patch
---

Fixed attaching a plugin built on a different copy of `@seedcord/core` failing with `Cannot read properties of undefined (reading 'setChannel')`. It now throws `CorePluginFromOtherCore`.
