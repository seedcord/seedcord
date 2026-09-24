---
'@seedcord/core': patch
'@seedcord/errors': patch
---

Fixed attaching a plugin built on a different copy of `@seedcord/core` failing with `Cannot read properties of undefined (reading 'setChannel')`. It now throws the new `CorePluginFromOtherCore` (1218) before the plugin is constructed.
