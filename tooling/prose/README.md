# @seedcord/prose

The repo's prose rules, checked by a machine. Private, never published.

- `vale/Seedcord/*.yml` are the [Vale](https://vale.sh) rules. The root `.vale.ini` loads them and lists which paths get linted. An `error` blocks the pre-commit hook and `vp run lint:prose`. A `suggestion` depends on the sense of the word, so only the write-time hook and the [Vale extension](https://marketplace.visualstudio.com/items?itemName=ChrisChinchilla.vale-vscode) in your editor show it.
- `prose.config.ts` runs the error rules over string literals of three or more words, where error messages and CLI output live. Vale only reads comments in code.
- `src/hook.ts` is the Claude Code `PostToolUse` hook from `.claude/settings.json`. After each Write or Edit it lints the file and reports the hits on the lines that edit wrote.

To ban a new word, add it to one of the YAML files. The writing-voice skill explains why each one is banned.

[CONTRIBUTING](../../.github/CONTRIBUTING.md#hooks) shows how to turn a rule off for one spot. Vale ignores its switches inside code files, so a code comment can't use one.
