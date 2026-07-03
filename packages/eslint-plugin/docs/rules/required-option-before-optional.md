# required-option-before-optional

Disallow a required slash option after an optional one.

Discord requires every required slash option to come before every optional one and rejects a command that lists them out of order. This rule walks a single builder chain and compares each option's `setRequired` state.

It checks only options whose required state is a literal boolean. If any option in the chain reads `setRequired` from a variable, or uses a callback the rule cannot read, the order is not statically provable and nothing is flagged.

## Incorrect

```ts
new SlashCommandBuilder()
    .addStringOption((o) => o.setName('a'))
    .addStringOption((o) => o.setName('b').setRequired(true));
```

## Correct

```ts
new SlashCommandBuilder()
    .addStringOption((o) => o.setName('b').setRequired(true))
    .addStringOption((o) => o.setName('a'));
```
