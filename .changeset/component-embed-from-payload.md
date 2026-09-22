---
'discord-component-embed': minor
---

Added `fromPayload` to check component embed JSON you already have, like a file you wrote by hand. It turns the JSON into a tree, and `toComponentEmbed` checks that tree against every rule a JSX card goes through.
