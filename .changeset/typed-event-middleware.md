---
'seedcord': minor
'@seedcord/services': patch
---

- Type event middleware by the events it runs for. A middleware that lists a single event in `{ events }` and its `EventMiddleware` generic reads `this.event` as that event's payload tuple, fully typed. A middleware that spans several events, or omits `{ events }` to run for every event, reads `this.eventName` to know which event fired, and `this.event` is `never`, because a middleware runs the same for every event it handles and so has no `match`. The controller threads the fired event name into the middleware. The `{ events }` list and the `EventMiddleware` generic are cross-checked, so listing an event in one but not the other is a compile error in both directions.
- **BREAKING**: on a middleware registered for two or more events, or a catchall with no `{ events }`, `this.event` is now `never`. Read `this.eventName` and do work that does not depend on the payload shape, or write one middleware per event to read a typed payload. Single-event middleware is unaffected.
