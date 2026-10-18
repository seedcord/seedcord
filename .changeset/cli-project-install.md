---
'seedcord': minor
'@seedcord/errors': minor
---

**BREAKING:** A `seedcord` command now throws `CliNotProjectInstall` when it runs from an install other than the project's own, like a global `seedcord dev`, and `CliDependencyMissing` when the project has no `seedcord`. Run it through a script in your `package.json` instead. A global `seedcord dev` used to print the bot's logs raw under the TUI, since the bot and the CLI loaded separate copies of seedcord.
