# subscriber-missing-decorators

Require `@Subscribe` on every concrete subscriber and `@WebhookUrl` on every webhook reporter.

A class that extends `Subscriber` registers only when it carries `@Subscribe`, and the bus never runs an undecorated one. A class that extends `WebhookLog` additionally needs `@WebhookUrl` naming its url env var, and registration throws at boot without it.

The base class must be imported from `seedcord` or a `@seedcord/*` package, and an `abstract` intermediate base is skipped.

## Incorrect

```ts
import { WebhookLog, Subscribe } from 'seedcord';

@Subscribe('memberBanned')
export class BanLog extends WebhookLog<'memberBanned'> {}
```

## Correct

```ts
import { WebhookLog, Subscribe, WebhookUrl } from 'seedcord';

@Subscribe('memberBanned')
@WebhookUrl('BAN_LOG_WEBHOOK_URL')
export class BanLog extends WebhookLog<'memberBanned'> {}
```
