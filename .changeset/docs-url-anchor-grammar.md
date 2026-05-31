---
'@seedcord/docs-engine': minor
---

Unify the docs anchor-fragment grammar. `DocSignature.fragment` and `DocSignature.anchor` are now a bare overload disambiguator (`overload-N` for multi-signature members, empty for a single signature) instead of a djb2 hash of the signature, and `anchor` no longer embeds the parent slug. Members are addressed by their bare local name. Docs deep-link fragments change shape; URLs are stable from this version forward.
