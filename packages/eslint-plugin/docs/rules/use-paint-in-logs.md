# use-paint-in-logs

Disallow chalk inside a logger call. Style the value with `paint` from `@seedcord/errors`.

A terminal theme remaps chalk's named colors, so `chalk.blue` renders orange under monokai and the line loses the meaning the color carried. `paint` sets truecolor hex values that survive the remap, and each tone names a job: `sky` for what the line is about, `mint` for success, `amber` for something to act on, `coral` for failure, `iris` for a count, `mute` for context around the subject.

This rule resolves the receiver's type and fires only when it is the `Logger` from `@seedcord/logger`, so a local class of the same name is left alone. It reads through the whole argument list, which covers a chalk call nested in a template literal and one passed as a later argument.

## Incorrect

```ts
logger.info(chalk.cyan('/health'));
logger.error(`route ${chalk.red(route)} failed`);
```

## Correct

```ts
logger.info(paint.sky('/health'));
logger.error(`route ${paint.coral(route)} failed`);
```

Tones chain, so a tone carries weight and style too.

```ts
logger.warn(`Slash route ${paint.sky.bold(route)} has no handler.`);
```

`paint` also carries `bold`, `italic` and `underline` on their own, for the parts of a line that spend no color. `paint.mute` is the name for dim.

```ts
logger.trace(`${paint.italic('Starting')} task ${paint.sky.bold(task.name)}`);
```
