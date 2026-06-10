---
'seedcord': minor
'@seedcord/services': patch
---

- Add multi-event support to `EventHandler`. A handler registered for several events with `@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])` branches with `this.match`, keyed by event name, and each arm receives that event's payload as named parameters carrying the discord.js tuple labels, for example `messageUpdate: (oldMessage, newMessage) => ...`, fully typed, so a missing arm is a compile error and a param past the event's arity is a compile error. A single-event handler reads `this.event` as its payload tuple, unchanged. The controller threads the fired event name into the handler, so the branch is the real event that fired rather than a guess from the payload shape.
- **BREAKING**: on a handler registered for two or more events, `this.event` is now `never`, so the previous hand-narrowing of the payload union no longer compiles. Branch with `this.match` instead. Single-event handlers are unaffected.
