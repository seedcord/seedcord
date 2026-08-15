<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

<div align="center">
  <h3>The whole Discord bot, wired and typed</h3>
  <a href="https://seedcord.org">Website</a> ·
  <a href="https://guide.seedcord.org">Guide</a> ·
  <a href="https://docs.seedcord.org">Reference</a> ·
  <a href="https://discord.gg/DzFxY58WXf">Discord</a>
</div>

<br />

<div align="center">

[![npm](https://img.shields.io/npm/v/@seedcord/utils?style=flat-square&logo=npm&logoColor=c8341f&label=&labelColor=1f1f1f&color=c8341f)](https://www.npmjs.com/package/@seedcord/utils) [![node](https://img.shields.io/node/v/@seedcord/utils?style=flat-square&label=node&labelColor=1f1f1f&color=4d7d33)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@seedcord/utils?style=flat-square&label=&labelColor=1f1f1f&color=f8f6e8)](LICENSE)

</div>

## About

`@seedcord/utils` holds the small functions the rest of seedcord builds on.

Until v1.0.0, minor versions can break.

## Installation

Your transport already re-exports this.

```sh
pnpm add @seedcord/utils
```

## Numbers

<!-- prettier-ignore-start -->

| function | what it does |
| --- | --- |
| `currentTime()` | the current time in epoch seconds |
| `generateCode(digits)` | a random numeric code with that many digits |
| `ordinal(n)` | the number with its suffix, `1st`, `22nd`, `13th` |
| `parseDuration(input)` | `'30m'` to milliseconds. Returns `null` on a bare number, an unknown or uppercase unit, a fraction, or a zero result |
| `percentage(a, b)` | `a` as a percentage of `b`, to two decimals |
| `round(num, precision)` | rounds to that many decimal places |
| `roundToDenomination(num, opts?)` | `1234` to `"1.2K"`. Suffixes and precision are configurable |
| `timestampFromSnowflake(id)` | the epoch ms encoded in the top 42 bits of a Discord snowflake |
| `toEpochSeconds(ms)` | epoch ms to epoch seconds, the unit Discord's `<t:...>` markup reads |

<!-- prettier-ignore-end -->

Passing epoch ms straight into `<t:...>` renders a date tens of thousands of years out, so convert with `toEpochSeconds` first.

## Strings

<!-- prettier-ignore-start -->

| function | what it does |
| --- | --- |
| `capitalize(word)` | first letter uppercase, the rest lowercase |
| `longestStringLength(arr)` | the character count of the longest element, numbers included |
| `prettify(key, opts?)` | camelCase, PascalCase, snake_case, or kebab-case to spaced words |
| `prettyDifference(before, after)` | the difference as a string, prefixed with `+` when positive |
| `renderTable(data, options?)` | a framed monospace table for Discord. Widths use display width, so emoji and CJK cells stay aligned. Pass `budget` for one string per page |
| `stripAnsi(value)` | strips ANSI escape sequences, for a sink that would print them raw |

<!-- prettier-ignore-end -->

## Objects

<!-- prettier-ignore-start -->

| function | what it does |
| --- | --- |
| `filterCirculars(value, opts?)` | a JSON-safe clone with circular references replaced by a marker. `decycle` mode skips `toJSON`, `json` mode runs stringify and parse |
| `hasKeys(obj, keys)` | a type guard over dot-notation paths. Returns true when every path exists and is non-null, and narrows the object to match |
| `keepDefined(source, ...keys)` | copies the named keys whose values are neither `undefined` nor `null`. Omit the keys to sweep all of them |

<!-- prettier-ignore-end -->

## Misc

<!-- prettier-ignore-start -->

| function | what it does |
| --- | --- |
| `assertNever(value)` | exhaustiveness guard for a `switch` default. Adding a union variant without a case fails to compile |
| `formatFilePath(path, opts?)` | a path rewritten relative to the working directory, `./src/Bot.ts`. Returns it unchanged outside that directory or on a runtime with no `process` |
| `fyShuffle(items)` | Fisher-Yates shuffle. Returns a new array and leaves the original alone |

<!-- prettier-ignore-end -->

## Node

`@seedcord/utils/node` is a separate entry as it reads the filesystem.

<!-- prettier-ignore-start -->

| function | what it does |
| --- | --- |
| `isTsOrJsFile(entry)` | whether a `Dirent` is a `.ts` or `.js` file, skipping `.d.ts` and `.map` |
| `traverseDirectory(dir, callback)` | walks a directory, imports every `.ts` and `.js` file under it, and calls back with each module |

<!-- prettier-ignore-end -->
