---
'@seedcord/core': minor
---

**BREAKING:** core's default bus keys are now five, all camelCase, and each transport augments the set with its own. `publish` no longer accepts any of them, including `unknownException` and `handledException`. `on`, `once`, and `waitFor` stay open for every key. A bot that reported its own faults declares its own key and its own `WebhookLog`.

Two keys are new. `interactionDispatched` fires once per dispatch with `routeId`, `kind`, `outcome` (`handled` / `refused` / `failed`), `fallback`, `durationMs`, and `queuedMs`. `responseSent` fires on every successful write through the reply surface with `routeId`, `method`, `durationMs`, and `messageId`.

The thrown value decides `outcome`, so a gate and a handler label the same stop identically. A `Silence` and a `Notice` with `report` false are `refused`. A `Notice` with `report` true, which includes a default `Fault`, is `failed`.
