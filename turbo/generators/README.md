# Package generator

`turbo gen package` scaffolds a new published `@seedcord/<name>` leaf package under `<dir>/<name>/`. `dir` is `packages` for a framework package, `plugins` for an ecosystem plugin, `cli` for a command-line package, and `tooling` for a shared build or lint config.

```sh
turbo gen package
# or non-interactive
turbo gen package --args <name> "<one-line description>" <dir>
```

It prompts for the unscoped name, a description, and the workspace folder, then writes `package.json`, `tsconfig.json`, `tsdown.config.ts`, `eslint.config.ts`, `tsdoc.json`, `README.md`, `LICENSE`, `src/index.ts`, `tests/.gitkeep`, and `vitest.config.ts` from the templates in `templates/`.

Under `packages/` the folder basename matches the unscoped package name. Under `plugins/` the folder omits the `plugin-` prefix, so `@seedcord/plugin-mongoose` scaffolds into `plugins/mongoose/`. The prefix earns its place on npm, where a package name carries no parent folder.

Every tool that walks the workspace reads each package's name from its `package.json`, so the folder name stays a human-facing label. The globs below are the exception and name the folder directly.

A new workspace root (a sibling of `packages/`, `plugins/`, `cli/`, and `tooling/`) goes in `pnpm-workspace.yaml` first. Docs extraction reads its package roots from there and skips every package marked `private`. `scripts/check-workspace-catalog.ts` lists the roots separately in `WORKSPACE_GLOBS`, so add the root there too.

A minimal published scoped package, `version` `0.0.0`, no runtime dependencies, only the three internal config devDeps plus the `typescript` peer (`catalog:peer`), a single `.` export with one tsdown entry, `publishConfig` access public with provenance, tsconfig extending `@seedcord/tsconfig/node`, tsdown via `createTsdownConfig`, and the `version` export line.

## This needs separate wiring after generating

Finish these after generating, none of them are automated.

1. `.changeset/pre.json`, add `"@seedcord/<name>": "<first-version>"` to `initialVersions` (skip for a private package).
2. `.github/labeler.yml`, add a `'📦 <name>'` glob block matching `<dir>/<name>/**`.
3. `.github/labels.yml`, add the `📦 <name>` label entry (name, a muted color).
4. `knip.json`, add `"<dir>/<name>": {}` to the `workspaces` map.
5. `turbo.json`, add `"@seedcord/<name>#build"` to the `dependsOn` list on `//#docs:extract` (skip for a private package). The extractor reads every published package's built declarations.
6. `tooling/docs-engine/src/packages/identity.ts`, add a `PACKAGE_OVERRIDES` entry (`displayName` plus any `aliases`) for `@seedcord/<name>`. Without it the docs site renders the full scoped name. The override sets the short display name (`core`) and extra search aliases. Skip for a package with no documented entry point, it never shows in the docs site.
7. `pnpm-workspace.yaml` catalogs, move any dependency now used by two or more packages into the matching catalog bucket (`deps`, `peer`, `test`, `react`) and reference it as `catalog:<bucket>`. `check:catalog` gates prePush on this.
8. The package's own `package.json`, set the real `version`, add runtime `dependencies` (`catalog:deps` or `workspace:*`), any extra `peerDependencies` with `peerDependenciesMeta` (for example `discord.js` as `catalog:peer`), extra `devDependencies`, and the `./internal` export block plus a second tsdown entry plus `src/internal.index.ts` if the package ships an internal surface.
9. For a private package, drop `publishConfig`, add `"private": true`, and skip step 1, 5, 10, and 11. For a public package, set the `version` first (the changeset pre-mode flow, or by hand), build, then publish from the package folder.
10. Bootstrap the package on npm by publishing it once by hand. Only `@materwelonDhruv` can do this.

    ```sh
    # set "version": "0.0.1" in <dir>/<name>/package.json first, then:
    pnpm -C <dir>/<name> build
    cd <dir>/<name>
    # latest first, a bare publish defaults to the latest tag, no provenance locally
    npm publish --access public --no-provenance
    # then point next at the same version
    npm dist-tag add @seedcord/<name>@0.0.1 next
    # deprecate both tags in one go (since both are the same version)
    npm deprecate @seedcord/<name>@0.0.1 "This is a bootstrap version, please use the next tag for development."
    ```

11. Update OIDC trust for the `publish.yml` workflow for the new packages on the npm page. Only `@materwelonDhruv` can do this as well.
