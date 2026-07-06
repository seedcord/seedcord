# event-handler-missing-register-event

Require `@RegisterEvent` on every concrete event handler.

A class that extends `EventHandler` registers only when it carries `@RegisterEvent`. Without it the handler loads without error and never registers, so the Discord event fires with no listener and the handler never runs.

The base class must be imported from `seedcord` or a `@seedcord/*` package, and an `abstract` intermediate base is skipped.

## Incorrect

```ts
import { EventHandler } from 'seedcord';

export class PingPong extends EventHandler<Events.MessageCreate> {}
```

## Correct

```ts
import { EventHandler } from 'seedcord';

@RegisterEvent([Events.MessageCreate])
export class PingPong extends EventHandler<Events.MessageCreate> {}
```
