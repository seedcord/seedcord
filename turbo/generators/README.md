# Package generator

`turbo gen package` scaffolds a new published `@seedcord/<name>` leaf package under `packages/<name>/`.

```sh
turbo gen package
# or non-interactive
turbo gen package --args <name> "<one-line description>"
```

It prompts for the unscoped name and a description, then writes `package.json`, `tsconfig.json`, `tsdown.config.ts`, `eslint.config.mjs`, `tsdoc.json`, `README.md`, `LICENSE`, `src/index.ts`, and `tests/basic.test.ts` from the templates in `templates/`.

A minimal published scoped package, `version` `0.0.0`, no runtime dependencies, only the three internal config devDeps plus the `typescript` peer (`catalog:peer`), a single `.` export with one tsdown entry, `publishConfig` access public with provenance, tsconfig extending `@seedcord/tsconfig/node`, tsdown via `createTsdownConfig`, and the `version` export line.

## This needs separate wiring after generating

Finish these after generating, none of them are automated.

1. `.changeset/pre.json`, add `"@seedcord/<name>": "<first-version>"` to `initialVersions` (skip for a private package).
2. `.github/labeler.yml`, add a `'📦 <name>'` glob block matching `packages/<name>/**`.
3. `.github/labels.yml`, add the `📦 <name>` label entry (name, a muted color, description).
4. `knip.json`, add `"packages/<name>": {}` to the `workspaces` map.
5. `packages/docs-engine/src/packages/identity.ts`, add a `PACKAGE_OVERRIDES` entry (`displayName` plus any `aliases`) for `@seedcord/<name>`. Without it the docs site renders the full scoped name. The override sets the short display name (`core`) and extra search aliases. Skip for a package with no documented entry point, it never shows in the docs site.
6. `pnpm-workspace.yaml` catalogs, move any dependency now used by two or more packages into the matching catalog bucket (`deps`, `peer`, `test`, `react`) and reference it as `catalog:<bucket>`. `check:catalog` gates prePush on this.
7. The package's own `package.json`, set the real `version`, add runtime `dependencies` (`catalog:deps` or `workspace:*`), any extra `peerDependencies` with `peerDependenciesMeta` (for example `discord.js` as `catalog:peer`), extra `devDependencies`, and the `./internal` export block plus a second tsdown entry plus `src/internal.index.ts` if the package ships an internal surface.
8. For a private package, drop `publishConfig`, add `"private": true`, and skip step 1, 9, and 10. For a public package, set the `version` first (the changeset pre-mode flow, or by hand), build, then publish from the package folder.
9. Bootstrap the package on npm by publishing it once by hand. Only `@materwelonDhruv` can do this.

    ```sh
    # set "version": "0.0.1" in packages/<name>/package.json first, then:
    pnpm -C packages/<name> build
    cd packages/<name>
    # latest first, a bare publish defaults to the latest tag, no provenance locally
    npm publish --access public --no-provenance
    # then point next at the same version
    npm dist-tag add @seedcord/<name>@0.0.1 next
    ```

10. Update OIDC trust for the `publish.yml` workflow for the new packages on the npm page. Only `@materwelonDhruv` can do this as well.
