# no-raw-client-events

Disallow raw client.on handlers for gateway events. Route them through `@RegisterEvent`.

A raw `client.on('messageCreate', ...)` runs outside seedcord. It bypasses the event dispatcher and the middleware chain that an `@RegisterEvent` handler runs through.

This rule resolves the receiver's type and fires only when it is a discord.js `Client`. It reads the event name from the argument's type, so `client.on('guildCreate', ...)` and `client.on(Events.GuildCreate, ...)` are treated the same. It does not flag:

- Client meta and lifecycle events (`ready`, `error`, `warn`, `debug`, `cacheSweep`, `invalidated`, and the `shard*` events), which are not gateway dispatch events.
- `interactionCreate`, which routes through the interaction dispatcher and its handlers.
- A dynamic event name, which cannot be classified.

## Incorrect

```ts
client.on('messageCreate', (message) => handle(message));
client.on(Events.GuildMemberAdd, (member) => welcome(member));
```

## Correct

```ts
@RegisterEvent([Events.MessageCreate])
class OnMessage extends EventHandler<Events.MessageCreate> {
    async execute() {
        handle(this.event);
    }
}
```
