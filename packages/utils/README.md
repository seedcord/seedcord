<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

<div align="center">
  <h3>The whole Discord bot, typed end to end</h3>
  <a href="https://seedcord.org">Website</a> ·
  <a href="https://seedcord.org/guide">Guide</a> ·
  <a href="https://seedcord.org/docs">Reference</a> ·
  <a href="https://discord.gg/DzFxY58WXf">Discord</a>
</div>

<br />

<div align="center">

[![npm](https://img.shields.io/npm/v/@seedcord/utils?style=flat-square&label=npm&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/utils) [![node](https://img.shields.io/node/v/@seedcord/utils?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![bun](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fseedcord%2Fseedcord%2Fnext%2Fpackages%2Futils%2Fpackage.json&query=%24.engines.bun&style=flat-square&label=bun&labelColor=1f1f1f&color=fbf0df)](https://bun.com) [![license](https://img.shields.io/npm/l/@seedcord/utils?style=flat-square&label=license&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/utils` has the small functions seedcord uses everywhere: number and time helpers, string formatting, object helpers, and the readers that load a bot's files.

Both seedcord transports depend on it and re-export it, so a bot imports these from its transport. Install it directly for the helpers in a plugin or any other project.

seedcord is pre-1.0, so a minor version can break your code. Each release's changelog says what changed and how to update.

## Installation

```sh
pnpm add @seedcord/utils
```

## Usage

```ts
import { ordinal, parseDuration, renderTable } from '@seedcord/utils';

parseDuration('30m'); // 1800000
ordinal(22); // '22nd'

const table = renderTable([
    ['player', 'wins'],
    ['ana', '12']
]);
```

## Functions

<!-- prettier-ignore-start -->

| function | what it does |
| --- | --- |
| `currentTime()` | the current time in epoch seconds |
| `generateCode(digits)` | a random numeric code with that many digits |
| `ordinal(n)` | the number with its suffix, like `22nd` |
| `parseDuration(input)` | `'30m'` to milliseconds, or `null` when it can't parse the input |
| `percentage(a, b)` | `a` as a percentage of `b`, to two decimals |
| `round(num, precision)` | rounds to that many decimal places |
| `roundToDenomination(num, opts?)` | `1234` to `'1.2K'` |
| `timestampFromSnowflake(id)` | the time a Discord snowflake was created, in epoch ms |
| `toEpochSeconds(ms)` | epoch ms to epoch seconds, the unit Discord's `<t:...>` markup reads |
| `capitalize(word)` | first letter uppercase, the rest lowercase |
| `longestStringLength(arr)` | the length of the longest element |
| `prettify(key, opts?)` | `camelCase`, `PascalCase`, `snake_case`, or `kebab-case` to spaced words |
| `prettyDifference(before, after)` | the difference as a string, with `+` in front when positive |
| `renderTable(data, options?)` | a monospace table for a Discord message |
| `stripAnsi(value)` | removes ANSI escape codes |
| `filterCirculars(value, opts?)` | a copy that `JSON.stringify` accepts, with circular references replaced |
| `hasKeys(obj, keys)` | checks that every dot path exists and isn't null, and narrows the type |
| `keepDefined(source, ...keys)` | copies the keys whose values aren't `undefined` or `null` |
| `assertNever(value)` | a `switch` default that fails to compile when a case is missing |
| `formatFilePath(path, opts?)` | a path relative to the working directory, like `./src/Bot.ts` |
| `fyShuffle(items)` | a shuffled copy of the array |
| `importFiles(dir)` | imports every code file under a folder, one at a time in a `for await` loop |
| `readFiles(dir)` | reads every other file under a folder as a `Buffer`, one at a time in a `for await` loop |

<!-- prettier-ignore-end -->

`importFiles` and `readFiles` resolve a relative folder against `root` from `seedcord.config.ts`. Outside a seedcord bot, pass them an absolute path. The [reference](https://seedcord.org/docs/packages/utils/latest) has every option.
