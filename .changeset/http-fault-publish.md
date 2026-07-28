---
'@seedcord/http': minor
---

The http boundary now publishes faults on the bus, matching gateway. A reported `Notice` publishes `handledException` with an interaction source built from the raw payload, and a raw throw publishes `unknownException`. Both go through the same 60s per-route throttle gateway uses.
