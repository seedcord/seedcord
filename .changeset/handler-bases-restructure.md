---
'seedcord': minor
---

- **BREAKING**: `InteractionHandler` is no longer part of the public API. Every interaction kind now has its own typed base, so extend `SlashHandler`, `ButtonHandler`, `ModalHandler`, `SelectHandler`, or `AutocompleteHandler` instead.
