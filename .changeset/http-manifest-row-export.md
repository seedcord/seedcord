---
'@seedcord/http': minor
---

**BREAKING:** Every `RouteManifest` key takes a `Routes` suffix (`commands` becomes `commandRoutes`), and a fifth `middlewareRoutes` list joins them. Each row now carries `exportName` and `from`, and `load` returns the module.

Each row resolves to the class its `exportName` gives, even when one file exports two handler classes. Before this, both rows reached whichever class appeared first in the module.
