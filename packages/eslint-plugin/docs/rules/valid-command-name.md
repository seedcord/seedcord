# valid-command-name

Enforce Discord chat-input name rules on slash command and option names.

Discord rejects a slash command or option name that is not lowercase, or that uses anything outside letters, digits, hyphens, and underscores, or that runs past 32 characters. A context menu command name has none of these limits, it may use spaces and uppercase.

This rule resolves the type of the builder `setName` is called on. It flags the name only when that builder is a slash command or option builder (`SlashCommandBuilder`, `SlashCommandStringOption`, and the rest of the `SlashCommand*` family), so a `ContextMenuCommandBuilder` name is not flagged. The seedcord `this.instance` form resolves the same way through the component's generic.

There is no autofix. Slugifying a name would rename the command, which desyncs it from its route.

## Incorrect

```ts
new SlashCommandBuilder().setName('Ban User');
new SlashCommandBuilder().addStringOption((o) => o.setName('Target'));
```

## Correct

```ts
new SlashCommandBuilder().setName('ban-user');
new SlashCommandBuilder().addStringOption((o) => o.setName('target'));
new ContextMenuCommandBuilder().setName('View Profile');
```
