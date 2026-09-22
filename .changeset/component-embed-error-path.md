---
'discord-component-embed': minor
---

`ComponentEmbedError` has a new `path` field with the steps from the root to the component that broke a rule, like `['Container', 'PostCard', 'Section 2']`. The message ends with the same steps after `Found at`.
