---
'@seedcord/gateway': minor
---

**BREAKING:** `core.bot` no longer emits events, and `Bot` no longer extends the event emitter. The four keys move to the bus under new names. `error:unhandled:interaction` becomes `unhandledInteractionError`, `error:unhandled:event` becomes `unhandledEventError`, `any:event` becomes `anyEvent`, and `any:interaction` becomes `anyInteraction`. Register them with `core.bus.on(...)` or a `@Subscribe` subscriber class.

**BREAKING:** `Paginator.start(handler)` takes the handler, normally `this`, in place of the interaction and core. It sends through that handler's sender, so the page write reports the same `routeId` the dispatch did.

A write from the fault boundary reports the dispatcher's route id. A middleware or constructor throw leaves no handler sender, and the boundary's own sender previously reported an id with no interaction kind on it, so `responseAttempted` and `interactionDispatched` disagreed for one dispatch.

A component or modal whose customId carries no route prefix now reaches the unhandled default and gets a reply, matching http. It previously logged a warning and left the interaction with no reply.

A fault during autocomplete now sends empty choices, which clears the client's loading spinner.

A handler that throws a non-Error value now gets the generic fault card and an `unknownException` report, where it previously escaped the boundary with no reply. The value is wrapped in an `Error` with `String(value)` as the message and the original as `cause`.

A fault log line now writes on every occurrence. The 60s throttle covers the bus publish alone, so the uuid on a user's error card always resolves to a log line.
