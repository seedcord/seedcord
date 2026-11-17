---
'@seedcord/eslint-config': patch
---

Fixed `--fix` turning a static method call like `Logger.Error('x')` into `new Logger.Error('x')`. The config no longer turns on `unicorn/throw-new-error`, since `unicorn/new-for-builtins` already covers `Error()`.
