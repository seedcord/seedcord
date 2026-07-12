---
'@seedcord/eslint-plugin': minor
---

The decorator rules `event-handler-missing-register-event`, `middleware-missing-register-decorator`, `command-builder-missing-register-command`, and `interaction-handler-missing-route` match decorators by origin, the same way `subscriber-missing-decorators` does. An aliased or relative import counts, and a same-named decorator from another package no longer passes.
