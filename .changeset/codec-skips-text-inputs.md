---
'@seedcord/eslint-plugin': patch
---

Fixed `use-custom-id-codec` flagging the custom id of a text input, like `input.setCustomId('reason')` in a modal. That id only keys the value you read back with `getTextInputValue`.
