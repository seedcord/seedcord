---
'@seedcord/utils': minor
---

Rename `generateAsciiTable` to `renderTable` and fold pagination into it. Passing a `budget` returns one `string` per page (header repeated on each, default 2000) instead of a single string, so the separate `paginateAsciiTable` is gone. Fix `numericAlign` to judge a column by its body rows so a numeric column under a text header now right-aligns. Add `fence` to wrap the output in a triple-backtick block for monospace rendering in Discord messages and embeds, counted against `budget`. Default is now a rounded table. And a lot more customization options!
