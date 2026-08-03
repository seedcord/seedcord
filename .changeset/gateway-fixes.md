---
'@seedcord/gateway': patch
---

Duplicate interaction routes and same-named middleware classes now throw at registration, where the later one used to overwrite the earlier silently.

A `once` event handler no longer runs twice when its event fires concurrently. A throwing `core.bus.on()` listener no longer escapes `publish` or skips the listeners after it. Editing a subscriber file hot-reloads it in dev.
