# event-handler-missing-register-event

Require `@RegisterEvent` on every concrete event handler.

A class that extends `EventHandler` registers only when it has `@RegisterEvent`. Without it the handler loads without error and never registers, so it never runs when discord.js emits the event.

The base class must be imported from `seedcord` or a `@seedcord/*` package, and an `abstract` intermediate base is skipped.

The decorator matches by origin. A seedcord, relative, or tsconfig-alias import counts, an aliased name counts, and a same-named decorator from another package never does.

## Incorrect

```ts
import { EventHandler } from 'seedcord';

export class PingPong extends EventHandler<Events.MessageCreate> {}
```

## Correct

```ts
import { EventHandler, RegisterEvent } from 'seedcord';

@RegisterEvent([Events.MessageCreate])
export class PingPong extends EventHandler<Events.MessageCreate> {}
```
