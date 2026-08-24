# interaction-handler-missing-route

Require a route decorator on every concrete interaction handler.

A class that extends `SlashHandler`, `ButtonHandler`, `ModalHandler`, `SelectMenuHandler`, `UserContextMenuHandler`, `MessageContextMenuHandler`, or `AutocompleteHandler` registers only when it carries the matching route decorator (`@SlashRoute`, `@ButtonRoute`, and so on). Without one the handler loads without error and never registers, and its interactions fall through to the unhandled default.

The base class must be imported from `seedcord` or a `@seedcord/*` package. A same-named class from another module is not flagged, and an `abstract` intermediate base is skipped.

The route decorators match by origin. A seedcord, relative, or tsconfig-alias import counts, an aliased name counts, and a same-named decorator from another package never does.

## Incorrect

```ts
import { SlashHandler } from 'seedcord';

export class BanHandler extends SlashHandler<'ban'> {
    async execute() {}
}
```

## Correct

```ts
import { SlashHandler, SlashRoute } from 'seedcord';

@SlashRoute('ban')
export class BanHandler extends SlashHandler<'ban'> {
    async execute() {}
}
```
