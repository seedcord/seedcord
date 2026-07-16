---
'@seedcord/http': minor
---

Component and modal handlers decode customIds: the route decorators (exported from the package root) register the definitions, and `this.params` / `this.match` read the decoded values.

**BREAKING:** `SelectMenuHandler` takes the select kind as its first generic (`SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]>`) and narrows `event.data` to that kind. The manifest row types are removed from the package root exports, `RouteManifest` stays, and the `AutocompleteRoute` identifier now names the decorator.
