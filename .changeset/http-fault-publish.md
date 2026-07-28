---
'@seedcord/http': minor
---

`anyInteraction` publishes for every verified interaction before routing, carrying the raw `APIInteraction`.

Autocomplete choices responses publish `responseAttempted`.

An unmatched route keeps the attempted command name, so `routeId` reads `slash:inventory` where it read `slash:unhandled`.

A dispatch that throws past the boundary publishes `unhandledInteractionError`, which gateway already did.

The http boundary now publishes faults on the bus, matching gateway. A reported `Notice` publishes `handledException` with an interaction source built from the raw payload, and a raw throw publishes `unknownException`. Both go through the same 60s per-route throttle gateway uses.
