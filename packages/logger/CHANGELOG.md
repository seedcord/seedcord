# @seedcord/logger

## 0.1.0-next.1

### Minor Changes

- 701b669: `utils.block` takes an optional fourth `styleHeading` parameter replacing the default mint bold.
- c959e1a: Error output renders the direct `cause` after the main stack.

### Patch Changes

- 701b669: Require envapt 8.1. A bot declaring its own envapt needs `^8.1.0` there too, an older pin installs a second copy whose `Envapter` state (the bound source, the detected environment) splits from the framework's.
- Updated dependencies [b03c8cd]
- Updated dependencies [c959e1a]
- Updated dependencies [137e641]
- Updated dependencies [c959e1a]
- Updated dependencies [5ec46ca]
    - @seedcord/types@0.8.0-next.6
    - @seedcord/utils@0.8.0-next.6

## 0.1.0-next.0

### Minor Changes

- cd3ee0f: **BREAKING:** `LoggerUtilities.box` is removed. `block` covers the same output.
- cd3ee0f: `formatBody(record)` renders the styled message body (interpolation, args, stack) without the time, level, or label prefix, for consumers that draw their own log chrome.
- cd3ee0f: New `@seedcord/logger` package. The core (`Logger`, `LoggerChannelRegistry`, `ObjectConsoleSink`) assembles a `LogRecord` and routes it through a level gate and two sink layers (config sinks plus a capture layer). The winston console and file sinks are exported from `@seedcord/logger/node`, so the core has no `node:*` imports and runs in edge workers. The `installSink` handle and `WinstonFileSink` implement `Symbol.dispose` for `using`.
- cd3ee0f: **BREAKING:** `installSink` defaults `muteConsole` to `false`. A capture sink mutes the console only when `muteConsole: true` is passed.
- cd3ee0f: The object and JSON sinks stamp `timestamp` from the record as ISO. The JSON sink read the format-time clock before, which could drift from the record's time.
- cd3ee0f: Add `utils.wrap` to pack labels into width-bounded lines.

### Patch Changes

- cd3ee0f: Render each format-specifier arg once. Build the node default sinks only when the config's `sinks` field is absent, so a supplied sink array avoids their construction side effects.
- cd3ee0f: The file sink opens on first write so repeated setup leaves no empty log files, evicted and reset sinks are disposed to close winston handles, and a log call with two Errors keeps both. The gateway loader flag resets when a bulk load throws. LoggerOptions is exported for typing the Logger constructor.
- Updated dependencies [cd3ee0f]
- Updated dependencies [cd3ee0f]
- Updated dependencies [93544a8]
- Updated dependencies [93544a8]
    - @seedcord/types@0.8.0-next.5
    - @seedcord/utils@0.8.0-next.5
