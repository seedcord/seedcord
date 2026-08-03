# middleware-missing-register-decorator

Require `@Middleware` on every concrete interaction or event middleware.

A class that extends `InteractionMiddleware` or `EventMiddleware` registers only when it carries `@Middleware`. Without it the middleware loads without error and never runs on a single request.

The base class must be imported from `seedcord` or a `@seedcord/*` package, and an `abstract` intermediate base is skipped.

The decorator matches by origin. A seedcord, relative, or tsconfig-alias import counts, an aliased name counts, and a same-named decorator from another package never does.

## Incorrect

```ts
import { EventMiddleware } from 'seedcord';

export class LogMiddleware extends EventMiddleware {}
```

## Correct

```ts
import { EventMiddleware, Middleware } from 'seedcord';

@Middleware(MiddlewareType.Event, 0)
export class LogMiddleware extends EventMiddleware {}
```
