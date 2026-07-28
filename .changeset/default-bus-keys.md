---
'@seedcord/core': minor
---

**BREAKING:** the framework's default bus keys are now a fixed set of eight, all camelCase. `publish` no longer accepts any of them, including `unknownException` and `handledException`. `on`, `once`, and `waitFor` stay open for every key. A bot that reported its own faults declares its own key and its own `WebhookLog`.

Two keys are new. `interactionDispatched` fires once per dispatch with `routeId`, `kind`, `outcome` (`handled` / `refused` / `failed`), `fallback`, `durationMs`, and `queuedMs`. `responseSent` fires on every successful write through the reply surface with `routeId`, `method`, `durationMs`, and `messageId`.
