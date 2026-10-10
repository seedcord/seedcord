---
'@seedcord/utils': patch
---

Fixed `filterCirculars` so only references on the active traversal path render as `[Circular]`. When your object shares a child across fields, each field now retains that child's contents.
