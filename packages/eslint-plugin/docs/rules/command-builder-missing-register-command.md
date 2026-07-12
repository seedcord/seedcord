# command-builder-missing-register-command

Require `@RegisterCommand` on every command builder.

A class that extends `BuilderComponent<'command'>` or `BuilderComponent<'context_menu'>` is collected for Discord deployment only when it carries `@RegisterCommand`. Without it the command loads without error and never appears in the slash list.

Only the `'command'` and `'context_menu'` literal type arguments are targeted. Nested `'group'` and `'subcommand'` builders, other component types, a non-literal type argument, and `abstract` bases are all skipped, and the base must come from `seedcord` or a `@seedcord/*` package.

The decorator matches by origin. A seedcord, relative, or tsconfig-alias import counts, an aliased name counts, and a same-named decorator from another package never does.

## Incorrect

```ts
import { BuilderComponent } from '@seedcord/core';

export class PingCommand extends BuilderComponent<'command'> {}
```

## Correct

```ts
import { BuilderComponent, RegisterCommand } from '@seedcord/core';

@RegisterCommand('global')
export class PingCommand extends BuilderComponent<'command'> {}
```
