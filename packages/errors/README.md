<p align="center">
  <img src="https://cdn.seedcord.org/assets/banner.webp" alt="seedcord" width="100%" />
</p>

---

`@seedcord/errors` holds the Seedcord framework fault classes (`SeedcordError`, `SeedcordTypeError`, `SeedcordRangeError`), their error codes, the message table, and the `isSeedcordError` type guard. Its only runtime dependency is chalk, so any package can depend on it without pulling in the logger stack.
