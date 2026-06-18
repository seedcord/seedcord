---
'seedcord': minor
'@seedcord/types': minor
---

Rework the error model around one base class and one reply shape.

- `CustomError` is renamed to `Notice`, the abstract base you extend and throw. The `emit` field is renamed to `report`. The `response` field (a `readonly EmbedBuilder`) is replaced by a `render(ctx)` method that returns a `ReplyResponse`.
- `ReplyResponse` is a new public type in `@seedcord/types`, a v2 reply shape of `components` plus optional `allowedMentions` and `files`. Discord's components-v2 flag forbids `content`, `embeds`, `stickers`, and `poll`. `RenderContext` is the new render argument.

To migrate, rename `CustomError` to `Notice`, rename `emit` to `report`, and replace the `response` field with a `render(ctx)` method returning a `ReplyResponse`.
