# interaction-handler-missing-route

Require a route decorator on every concrete interaction handler.

A class that extends `SlashHandler`, `ButtonHandler`, `ModalHandler`, `SelectMenuHandler`, `ContextMenuHandler`, or `AutocompleteHandler` registers only when it carries the matching route decorator (`@SlashRoute`, `@ButtonRoute`, and so on). Without one the handler loads without error and never registers, so its interactions fall through to `UnhandledEvent`.

The base class must be imported from `seedcord` or a `@seedcord/*` package. A same-named class from another module is left alone, and an `abstract` intermediate base is skipped.

## Incorrect

```ts
import { SlashHandler } from 'seedcord';

export class BanHandler extends SlashHandler<'ban'> {
    async execute() {}
}
```

## Correct

```ts
import { SlashHandler } from 'seedcord';

@SlashRoute('ban')
export class BanHandler extends SlashHandler<'ban'> {
    async execute() {}
}
```
