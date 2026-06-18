---
'seedcord': minor
'@seedcord/plugins': minor
---

Replace the database error path with a general `Fault`.

- `DatabaseError` is removed. `Fault` replaces it, a public `Notice` in `@seedcord/kit` whose `report` defaults true and whose constructor takes `{ cause }`. A service catch rethrows `new Fault({ cause: e })`.
- `@WrapDatabaseError` and `throwDatabaseError` are removed.

To migrate, replace `@WrapDatabaseError` and `throwDatabaseError` with a `try`/`catch` in the service method that rethrows `new Fault({ cause: e })` or write a decorator that does the same.
