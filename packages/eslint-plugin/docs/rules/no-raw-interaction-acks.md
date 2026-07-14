# no-raw-interaction-acks

Disallow raw discord.js ack calls on a handler interaction. Reply through the base-class members.

Inside a seedcord handler, calling `this.event.reply(...)` and the other djs ack methods answers Discord directly. That skips seedcord's ack-state machine and its error translation. The ack-state machine no longer tracks whether the interaction was answered, and a djs throw reaches the consumer untranslated. The base class defines `this.reply()`, `this.defer()`, `this.edit()`, `this.followUp()`, `this.update()`, `this.deferUpdate()`, `this.delete()`, and `this.showModal()`, each calling through that machine.

The rule reports on a class whose instance type extends `InteractionHandler` (the slash, context-menu, button, select, and modal handler bases). It resolves the receiver's type and reports only when it is a discord.js repliable interaction. The direct `this.event.reply(...)` and the alias `const e = this.event; e.reply(...)` share that receiver type, so both forms are reported. Middleware and autocomplete handlers are out of scope, and the destructured form `const { reply } = this.event` is a known gap.

The nine flagged methods are `reply`, `deferReply`, `editReply`, `followUp`, `deferUpdate`, `update`, `showModal`, `fetchReply`, and `deleteReply`. Replace `deleteReply` with `this.delete()`, and read the sent message from the return value of a reply member in place of `fetchReply`. The rule has no autofix. The argument shapes do not map across mechanically.

## Incorrect

```ts
@SlashRoute('ban')
export class BanHandler extends SlashHandler<'ban'> {
    async execute() {
        await this.event.reply('banned');
    }
}
```

## Correct

```ts
@SlashRoute('ban')
export class BanHandler extends SlashHandler<'ban'> {
    async execute() {
        await this.reply('banned');
    }
}
```
