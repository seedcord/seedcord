---
'@seedcord/core': minor
---

**BREAKING:** core's default bus keys are now five, all camelCase, and each transport augments the set with its own. `publish` no longer accepts any of them, including `unknownException` and `handledException`. `on`, `once`, and `waitFor` stay open for every key. A bot that reported its own faults declares its own key and its own `WebhookLog`.

Two keys are new. `interactionDispatched` fires once per dispatch with `routeId`, `interactionId`, `kind`, `outcome` (`handled` / `refused` / `failed`), `fallback`, `durationMs`, and `queuedMs`. `responseAttempted` fires on every write through the reply surface with `routeId`, `interactionId`, `method`, `outcome` (`sent` / `failed`), `durationMs`, `messageId`, and an `error` when the write threw.

Autocomplete choices responses publish `responseAttempted` too, with `method` `respond`.

A write that threw a non-Error reports an `Error` wrapping it, with the raw value on `cause`.

One dispatch reports one `routeId` across both keys, on both transports. A dispatch that runs the unhandled default previously reported its handler's class name on `responseAttempted`, so grouping by route split one route into two buckets.

Both carry `interactionId`, so a subscriber can join them and split a dispatch into its code time and its Discord round trips. `durationMs` on `interactionDispatched` runs from dispatch entry to the user having a response, replies included.

The thrown value's type sets `outcome`, so a gate and a handler label the same stop identically. A `Silence` and a `Notice` with `report` false are `refused`. A `Notice` with `report` true, which includes a default `Fault`, is `failed`.
