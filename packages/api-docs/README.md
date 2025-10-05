# @seedcord/api-docs

internal toolkit that turns our seedcord packages into typedoc json models. nothing here ships to npm.

```bash
pnpm --filter @seedcord/api-docs run extract
```

that command writes the generated json files into this package so ci can pick them up when we need them.
