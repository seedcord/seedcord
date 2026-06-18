---
'seedcord': minor
---

Clean up the handler API surface.

- `getConfirmation(interaction, prompt, options?)` replaces the Confirmable decorator and its types. Gate an action with `if (!(await getConfirmation(...))) return`.
- `populate()` is removed. The handler lifecycle runs construct, then gates, then `execute()`.
- `attemptSendDM` and `sendInText` are removed. Resolve a channel with `fetchText`.

To migrate, replace the Confirmable decorator with `getConfirmation`, move `populate()` setup to the top of `execute()`, and drop `attemptSendDM` and `sendInText`.
