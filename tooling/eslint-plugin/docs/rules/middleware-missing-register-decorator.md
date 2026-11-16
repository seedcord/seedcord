# middleware-missing-register-decorator

Require the matching register decorator on every concrete middleware.

`InteractionMiddleware` takes `@RegisterInteractionMiddleware` and `EventMiddleware` takes `@RegisterEventMiddleware`. A class carrying the other family's decorator reports since neither dispatcher would register it. Without a decorator the middleware loads without error and never runs on a single request.

The base class must be imported from `seedcord` or a `@seedcord/*` package, and an `abstract` intermediate base is skipped.

The decorator matches by origin. A seedcord, relative, or tsconfig-alias import counts, an aliased name counts, and a same-named decorator from another package never does.

## Incorrect

```ts
import { EventMiddleware } from 'seedcord';

export class LogMiddleware extends EventMiddleware {}
```

```ts
import { EventMiddleware, RegisterInteractionMiddleware } from 'seedcord';

@RegisterInteractionMiddleware()
export class LogMiddleware extends EventMiddleware {}
```

## Correct

```ts
import { EventMiddleware, RegisterEventMiddleware } from 'seedcord';

@RegisterEventMiddleware()
export class LogMiddleware extends EventMiddleware {}
```
