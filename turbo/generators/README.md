# Package generator

`turbo gen package` scaffolds a new published leaf package under `<dir>/<folder>/`. `<name>` is the full npm name, `@seedcord/<something>` for a seedcord package or a bare name for one that is not, like `eslint-plugin-discordjs`. `dir` is `packages` for a framework package or a small library of its own, `plugins` for an ecosystem plugin, `cli` for a command-line package, and `tooling` for a shared build or lint config.

```sh
turbo gen package
# or non-interactive
turbo gen package --args <name> "<one-line description>" <dir>
```

It prompts for the npm name, a description, and the workspace folder, then writes `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.ts`, `tsdoc.json`, `README.md`, `LICENSE`, `src/index.ts`, and `tests/.gitkeep` from the templates in `templates/`.

`<folder>` is the npm name without `@seedcord/`, so `@seedcord/core` scaffolds into `packages/core/`. Under `plugins/` the folder also omits the `plugin-` prefix: `@seedcord/plugin-mongoose` scaffolds into `plugins/mongoose/`. The prefix earns its place on npm, where a package name doesn't have a parent folder.

Every tool that walks the workspace reads each package's name from its `package.json`, so the folder name is only a label for people. The globs below are the exception and match the folder name directly.

Add a new workspace root (a sibling of `packages/`, `plugins/`, `cli/`, and `tooling/`) to `pnpm-workspace.yaml` first. Docs extraction and the catalog check both read the package roots from there, and docs extraction skips every package marked `private`.

The generated package is a minimal published scoped package:

- `version` `0.0.0`, without runtime dependencies
- five devDeps, the four config packages (`eslint-config`, `tsconfig`, `tsdown-config`, `vite-config`) and `@seedcord/prose`, plus the `typescript` peer (`catalog:peer`)
- a single `.` export with one tsdown entry
- `publishConfig` with public access and provenance
- a tsconfig that extends `@seedcord/tsconfig/node`, tsdown through `createTsdownConfig`, and the `version` export line

## This needs separate wiring after generating

Finish these after generating. None of them are automated.

1. `.github/labeler.yml`, add a `'📦 <name>'` glob block matching `<dir>/<folder>/**`. Label names leave out the `@seedcord/` scope.
2. `.github/labels.yml`, add the `📦 <name>` label entry (name, a muted color).
3. `knip.ts`, add the package to the `workspaces` map only when it needs its own `entry`, `project`, or `ignore`. Knip gives every unlisted workspace its defaults.
4. `turbo.json`, add `"<name>#build"` to the `dependsOn` list on `//#docs:extract` (skip for a private package). The extractor reads every published package's built declarations. To keep a published package off the docs site, set `"seedcordDocs": { "skip": true }` in its `package.json`, and skip this step and step 5.
5. `tooling/docs-engine/src/packages/identity.ts`, add a `PACKAGE_OVERRIDES` entry for `<name>`, with any search `aliases`. The docs site only lists a package that has an entry here. For a scoped package, set `displayName` to the name without `@seedcord/`, like `core`, since it has to match the package's docs folder. Skip this for a package without a documented entry point.
6. `pnpm-workspace.yaml` catalogs, move any dependency now used by two or more packages into the matching catalog bucket (`deps`, `peer`, `test`, `react`) and reference it as `catalog:<bucket>`. `check:catalog` gates prePush on this.
7. The package's own `package.json`, set the real `version` and add runtime `dependencies` (`catalog:deps` or `workspace:*`). Add any extra `peerDependencies` with `peerDependenciesMeta` (for example `discord.js` as `catalog:peer`), and any extra `devDependencies`. If the package ships an internal surface, add the `./internal` export block, a second tsdown entry, and `src/internal.index.ts`.
8. For a private package, remove `publishConfig`, add `"private": true`, and skip step 4, 9, and 10. For a public package, set the `version` first (the changeset pre-mode flow, or by hand), build, then publish from the package folder.
9. Bootstrap the package on npm by publishing it once by hand. Only `@materwelonDhruv` can do this.

    ```sh
    # set "version": "0.0.1" in <dir>/<folder>/package.json first, then:
    vp -C <dir>/<folder> run build
    cd <dir>/<folder>
    # latest first, a bare publish defaults to the latest tag, no provenance locally
    # --no-git-checks because the package isn't committed or on main yet
    pnpm publish --no-provenance --no-git-checks
    # then point next at the same version
    npm dist-tag add <name>@0.0.1 next
    ```

    npm stages the first publish of a new package. It puts up a `0.0.0-stage` placeholder to hold the name, and `0.0.1` waits in Validating until npm's checks finish. Approve `0.0.1` with 2FA on the package page, then deprecate both versions. `npm deprecate` returns a 404 until you approve.

    ```sh
    npm deprecate <name>@0.0.1 "This is a bootstrap version, please use the next tag for development."
    npm deprecate <name>@0.0.0-stage "Placeholder from npm's staged publishing. Use the next tag."
    # latest and next should both show 0.0.1
    npm view <name> dist-tags
    ```

10. Add `publish.yml` as the package's trusted publisher on npm. Only `@materwelonDhruv` can do this as well. Tick **Allow npm publish** because `changeset publish` runs a plain `npm publish`, which npm rejects without that box. Leave **Allow npm dist-tag** off because the workflow sets tags while it publishes.
