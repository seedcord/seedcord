# @seedcord/logger

## 0.6.1

### 🩹 Patch

- Fixed an async log sink on an edge bot getting cut off when the request ended, which lost the lines that it was sending to a log service. ([#442](https://github.com/seedcord/seedcord/pull/442))
- Removed the `node` field from `ILogSink` and the winston sinks, since nothing ever read it. ([#442](https://github.com/seedcord/seedcord/pull/442))

#### 📦 Seedcord packages

- `@seedcord/types` 0.16.1 → 0.16.2
- `@seedcord/errors` 0.15.0 → 0.15.1
- `@seedcord/utils` 0.9.1 → 0.9.2

## 0.6.0

### 💥 Breaking

- `Logger.inChannel()` is now `withChannel()`. The new `withLabel()` returns a logger on the same channel with a different label, like one per job a plugin runs. ([`3eecb63`](https://github.com/seedcord/seedcord/commit/3eecb63cf7f8443534469a537f898bd7c9ef9b01))

### 🩹 Patch

- Fixed the edge logger losing a `Date` passed to a log call, and spreading a class instance's fields into the top level. Both now go in `args`. ([#426](https://github.com/seedcord/seedcord/pull/426))
- Reworded error messages and log lines that joined their parts with the wrong word or read two ways. ([`6f71a86`](https://github.com/seedcord/seedcord/commit/6f71a868e39df8cff3b857688544404113d46596))
- Fixed `Logger.configure({ level: 'debug' })` on node swapping the winston console for the edge console sink, which printed each log as a multi-line object. A config without `sinks` now falls back to the node console. ([#436](https://github.com/seedcord/seedcord/pull/436))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.15.0-next.3 → 0.15.0
- `@seedcord/utils` 0.9.1-next.1 → 0.9.1
- `@seedcord/types` 0.16.0-next.1 → 0.16.0

## 0.5.0

### 💥 Breaking

- Requires Node 24.22.1+ on 24.x or Node 26.12.1+ for the October 2026 security fixes. ([`cc7930b`](https://github.com/seedcord/seedcord/commit/cc7930b810b17be66cff49c6cd793b199ef752a3))
- seedcord now needs envapt ≥9.2. Run `pnpm add envapt@latest`, then update your own envapt reads with the [v8 to v9 migration guide](https://envapt.materwelon.dev/docs/migration-v8-to-v9/). ([`99e7d64`](https://github.com/seedcord/seedcord/commit/99e7d6400b19af6db55548fd02c41ac1eb9b1737))
- `WinstonFileSink` now always writes inside the `logs` folder beside `seedcord.config.ts`, and `filename` takes only a file name. Change `filename: 'logs/bot-{date}.log'` to `filename: 'bot-{date}.log'`. A name with a folder in it throws the new `LoggerFileNameHasFolder`. ([#410](https://github.com/seedcord/seedcord/pull/410))
- `new WinstonConsoleSink()` without a `format` now prints JSON lines unless the bot runs from a terminal in development. It used to print readable columns everywhere. ([#418](https://github.com/seedcord/seedcord/pull/418))

### ✨ Minor

- Added a `json-ansi` format for `WinstonConsoleSink` that keeps ANSI color codes in `message`, so a tool that spawns the bot can render them. A bot in development prints it by default when its output is piped or redirected. ([#418](https://github.com/seedcord/seedcord/pull/418))
- Added `installNodeConsole()` to `@seedcord/logger/node`. It installs only the node console sink, pretty in development and JSON elsewhere. ([`b3d661a`](https://github.com/seedcord/seedcord/commit/b3d661a9ff02ab15c3b40aaea5dd786c79d9bc9c))

### 🩹 Patch

- Fixed pretty logging for object extras containing circular references or BigInt values. Circular references now appear as `[Circular]`, and BigInt values render as decimal digits. ([#378](https://github.com/seedcord/seedcord/pull/378), thanks [@lunaradev1](https://github.com/lunaradev1))
- Fixed an `Error` in a JSON log's `extras` coming out as just `{"name":"TypeError"}`. It now carries its `message` and `stack` too. ([`99256de`](https://github.com/seedcord/seedcord/commit/99256de0581810d71fab133090e07f8d2fea48d9))
- Fixed the JSON log format writing `logger.info('ran %s', 'ping')` with `ran %s` as its message. It now writes `ran ping`, and `extras` holds only the arguments left over after the specifiers. ([`99256de`](https://github.com/seedcord/seedcord/commit/99256de0581810d71fab133090e07f8d2fea48d9))
- Fixed the extra values in a log call showing in only one of your sinks. With the console and a file sink both on, `logger.info('saved', id, name)` printed `id` and `name` in the first sink to format the line and left them out of the second. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed a node bot crashing after its stdout closed, for example when you pipe its output into `head`, or spinning a CPU core if it had an `uncaughtException` handler. Console logs now stop once stdout closes, and the bot keeps running. ([#391](https://github.com/seedcord/seedcord/pull/391))
- Fixed `formatBody` starting with a space, or with a blank line above an error's stack, when the record's message is empty. ([#391](https://github.com/seedcord/seedcord/pull/391))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.14.0-next.0 → 0.14.0
- `@seedcord/types` 0.15.0-next.0 → 0.15.0
- `@seedcord/utils` 0.9.0-next.1 → 0.9.0

## 0.4.4

### 🩹 Patch

- Every package declares Bun 1.4.2 as its minimum in `engines`. ([`edbe71a`](https://github.com/seedcord/seedcord/commit/edbe71a8c8d5c9f20a2166f8848d2a638798c196))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.12.0 → 0.13.0
- `@seedcord/types` 0.14.3 → 0.14.4
- `@seedcord/utils` 0.8.16 → 0.8.17

## 0.4.3

### 🩹 Patch

- The README and the `discord-component-embed` doc comment examples now link the guide at `seedcord.org/guide` and the reference at `seedcord.org/docs`. ([#343](https://github.com/seedcord/seedcord/pull/343))
- Fixed the peer conflict that a bot on TypeScript 5.9 hit at install. The `typescript` peer now accepts 5.9, 6, and 7. ([#340](https://github.com/seedcord/seedcord/pull/340))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.1 → 0.12.0
- `@seedcord/types` 0.14.1 → 0.14.2
- `@seedcord/utils` 0.8.15 → 0.8.16

## 0.4.2

### 🩹 Patch

- The README tagline now reads "The whole Discord bot, typed end to end". ([`56f9eb8`](https://github.com/seedcord/seedcord/commit/56f9eb8d40c0c654530f950480820ae863441935))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.11.0 → 0.11.1
- `@seedcord/types` 0.14.0 → 0.14.1
- `@seedcord/utils` 0.8.14 → 0.8.15

## 0.4.1

### 🩹 Patch

- `@seedcord/logger` and `seedcord` now read `isPlainObject` from `@seedcord/utils`. ([#336](https://github.com/seedcord/seedcord/pull/336))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.10.0 → 0.11.0
- `@seedcord/utils` 0.8.13 → 0.8.14

## 0.4.0

### 💥 Breaking

- seedcord now needs envapt 8.2.2 or newer. Older versions throw `Cannot redefine property` when the CLI loads a class that reads its config through an `@Envapt` property. ([#327](https://github.com/seedcord/seedcord/pull/327))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.9.0 → 0.10.0
- `@seedcord/utils` 0.8.12 → 0.8.13

## 0.3.3

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.8.0 → 0.9.0
- `@seedcord/types` 0.13.0 → 0.14.0
- `@seedcord/utils` 0.8.11 → 0.8.12

## 0.3.2

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/types` 0.12.0 → 0.13.0
- `@seedcord/errors` 0.7.0 → 0.8.0
- `@seedcord/utils` 0.8.10 → 0.8.11

## 0.3.1

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.6.0 → 0.7.0
- `@seedcord/types` 0.11.0 → 0.12.0
- `@seedcord/utils` 0.8.9 → 0.8.10

## 0.3.0

### 💥 Breaking

- Every shared symbol key now reads `seedcord:` plus kebab-case. Plugin service metadata moved to the same global registry the core keys use. Make sure to update your packages together! You don't need to change any code for this. ([#301](https://github.com/seedcord/seedcord/pull/301))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.5.1 → 0.6.0
- `@seedcord/types` 0.10.1 → 0.11.0
- `@seedcord/utils` 0.8.8 → 0.8.9

## 0.2.2

### 🩹 Patch

- A log sink whose `onLog` returns a rejected promise used to crash the process. It now prints the same one-time console warning a synchronous throw does. ([#293](https://github.com/seedcord/seedcord/pull/293))
- Fix a sink that threw was still receiving records. The error line already said it won't. Now it does what the line said all this time. ([#296](https://github.com/seedcord/seedcord/pull/296))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.3 → 0.5.0
- `@seedcord/types` 0.9.1 → 0.10.0
- `@seedcord/utils` 0.8.7 → 0.8.8

## 0.2.1

### 🩹 Patch

- Updated TSDoc reference generation. ([`1d2f1e3`](https://github.com/seedcord/seedcord/commit/1d2f1e3))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.4.0 → 0.4.1
- `@seedcord/utils` 0.8.5 → 0.8.6
- `@seedcord/types` 0.9.0 → 0.9.1

## 0.2.0

### 💥 Breaking

- `paint` now comes from `@seedcord/errors`, and `ILogSink`, `LogLevel`, `LogRecord`, `LogSinkHandle`, `LoggerConfig`, `LoggerChannelId`, and `FrameworkChannel` now come from `@seedcord/types`. `@seedcord/logger` no longer re-exports them. Both transports still expose every one of these. ([`e11cbb3`](https://github.com/seedcord/seedcord/commit/e11cbb3))

### 🩹 Patch

- Update log colors in some places. ([`97b62ef`](https://github.com/seedcord/seedcord/commit/97b62ef))
- These packages now ship ESM only. `eslint-plugin-discordjs` keeps its CommonJS build. ([`f39cde0`](https://github.com/seedcord/seedcord/commit/f39cde0))
- Use `#` instead of `@` for tsconfig path aliases. ([`a259cdc`](https://github.com/seedcord/seedcord/commit/a259cdc))
- Rewrote package descriptions for all packages. Also added keywords. ([`a8d7b5f`](https://github.com/seedcord/seedcord/commit/a8d7b5f))
- Every package now declares Apache-2.0 along with its homepage, issue tracker, author, and funding link. ([`660a94d`](https://github.com/seedcord/seedcord/commit/660a94d))
- Every package now has a README describing that package, with badges and an install line. Seven of them previously shipped a copy of the root README that named no package at all. ([`c50ad6c`](https://github.com/seedcord/seedcord/commit/c50ad6c))
- Render aggregate errors ([#249](https://github.com/seedcord/seedcord/pull/249))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.4 → 0.4.0
- `@seedcord/types` 0.8.2 → 0.9.0
- `@seedcord/utils` 0.8.4 → 0.8.5

## 0.1.4

### 💥 Breaking

- envapt is a peer dependency now. Your project and seedcord load one copy, so the framework reads the config you set through `Envapter`. ([`71a0b99`](https://github.com/seedcord/seedcord/commit/71a0b99))

### 🩹 Patch

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.3 → 0.3.4
- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.3 → 0.8.4

## 0.1.3

### 🩹 Patch

- Moved `paint` to the errors package ([#238](https://github.com/seedcord/seedcord/pull/238))

#### 📦 Seedcord packages

- `@seedcord/errors` 0.3.2 → 0.3.3
- `@seedcord/utils` 0.8.2 → 0.8.3

## 0.1.2

### 🩹 Patch

- Update comments ([`272b729`](https://github.com/seedcord/seedcord/commit/272b729))

#### 📦 Seedcord packages

- `@seedcord/types` 0.8.1 → 0.8.2
- `@seedcord/utils` 0.8.1 → 0.8.2

## 0.1.1

### 🩹 Patch

- Bump deps. ([#228](https://github.com/seedcord/seedcord/pull/228))
- Set all packages' node floor to LTS. ([#228](https://github.com/seedcord/seedcord/pull/228))
- The logger now catches a sink that throws. Your logging call returns normally, the other sinks still get the record, and the broken sink is reported once on the console. ([#234](https://github.com/seedcord/seedcord/pull/234))

#### 📦 Seedcord packages

- `@seedcord/types` 0.8.0 → 0.8.1
- `@seedcord/utils` 0.8.0 → 0.8.1

## 0.1.0

### 💥 Breaking

- Node 24.3 or newer is required. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

### ✨ Minor

- New `@seedcord/logger`. `Logger` assembles a record and routes it through a level gate and two sink layers. ([`789f17a`](https://github.com/seedcord/seedcord/commit/789f17a))

    The core has no `node:*` imports and runs in edge workers. The winston console and file sinks come from `@seedcord/logger/node` and is set up automatically during dev.

### 🩹 Patch

- Require envapt `^8.1.0`. An older pin in your own bot installs a second copy whose `Envapter` state splits from the framework's. ([#196](https://github.com/seedcord/seedcord/pull/196))

#### 📦 Seedcord packages

- `@seedcord/types` 0.7.2-next.0 → 0.8.0
- `@seedcord/utils` 0.7.1-next.0 → 0.8.0
