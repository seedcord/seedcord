---
'@seedcord/plugins': minor
---

Mongo and KyselyPg now rethrow a `SeedcordError` when teardown fails, so a failed disconnect is reported during coordinated shutdown instead of resolving silently. Accessing `db.services` before the plugin finishes initializing throws instead of returning an empty map. The Postgres on-connect listener is wrapped in a catch and detached on teardown.
