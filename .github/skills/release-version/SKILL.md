---
name: release-version
description: Release seedcord's packages through changesets pre mode. Cut a prerelease from the long-lived `next` branch, graduate it to a stable release on `main`, then re-sync `next`. Use for any seedcord release on the `next` line.
---

# Releasing seedcord (prerelease, graduate, re-sync)

## Mental model

- `next` is the prerelease line. Its publishes go to the `next` dist-tag as `X.Y.Z-next.N`.
- `main` is stable. Its publishes go to `latest` as a clean `X.Y.Z`.
- seedcord is a monorepo, so one release versions and publishes every package that has a pending changeset at once, under the `@seedcord` scope (plus the unscoped `seedcord`).
- Publishing is CI-only. `.github/workflows/publish.yml` runs after the `checks` workflow finishes green on `main` or `next`, through a `workflow_run` trigger, then hands off to `changesets/action`, which runs `pnpm run release` and publishes. You version locally with `pnpm release:version`. CI never versions and never opens a release PR, and a push with changesets still pending skips the publish. A `docs-publish` job then syncs docs to R2, purges the CDN, and redeploys Railway. On `main`, a `github-release` job also pushes one `release-YYYY.MM.DD` tag and creates one GitHub release for the whole publish. A prerelease gets neither.
- The gate `.github/actions/check-eligibility` skips the publish on any branch while a changeset is pending, and on `next` unless `.changeset/pre.json` exists and is in `pre` mode. Exiting pre mode on `next` makes the gate skip the publish, so a clean version can never reach the `next` tag.
- npm's OIDC trusted publishing is bound to `publish.yml` by its filename. Renaming the workflow breaks publishing.
- A published version is permanent on npm. Only the dist-tag can move.

## Before any flow, check what will bump

`pnpm cs:status` writes `.changeset/status.json`. Two seedcord quirks:

- It reads only git-tracked changeset files, so `git add .changeset` first or a new `.md` is invisible to it.
- On the `next` line, run `pnpm cs:status --since next` so the baseline is the prerelease tip. The config `baseBranch` is `main`, so the default compares against stable.

## Pushing to `main` and `next`

The `Require PR for main or next` ruleset covers both branches. It requires a pull request, linear history and signed commits, and it lets admins bypass all three. Every direct `git push` below, and every `git merge` that makes a merge commit, needs that bypass.

## Flow 1, cut a prerelease from `next`

The publish ends on the `next` dist-tag as `X.Y.Z-next.N`. The changesets must already be on `next`.

```sh
git switch next && git pull
pnpm release:version                 # bump every pending package to X.Y.Z-next.N and tidy the changelogs
pnpm install                         # rewrite internal ranges into the lockfile
git add .changeset                   # pre mode moves each used changeset into .changeset/pre/, which -a would skip
git commit -am "chore(release): version packages"
git push origin next                 # no changesets pending, so publish.yml publishes directly
```

Then confirm the tag moved:

```sh
npm dist-tag ls seedcord             # and each other bumped package; check next moved and latest did not
```

## Flow 2, graduate `next` to stable

Run on `main` so the clean version reaches `latest`. Exiting pre mode and versioning on `next` would make the gate skip the publish, so graduate here.

```sh
git switch main && git pull
git merge next                       # resolve any changelog or pre.json conflicts
pnpm changeset pre exit              # set pre.json to exit mode, then review the changesets in .changeset/pre/
pnpm release:version                 # write the clean X.Y.Z and drop the superseded prerelease sections
pnpm install                         # update the lockfile
git add .changeset
git commit -am "chore(release): version packages"
git push origin main
```

Then **wait for the `main` publish workflow to finish green**, because CI does the actual publish.

```sh
npm dist-tag ls seedcord             # latest now points at the clean X.Y.Z
```

## Flow 3, re-sync `next` after a graduation

Bring the clean version back and re-enter pre mode for the next cycle.

```sh
git switch next && git pull
git merge main                       # brings the clean versions and changelogs
pnpm changeset pre enter next        # re-enter pre mode
git add .changeset/pre.json          # pre enter writes a new file, -a would skip it
git commit -m "chore: re-enter pre mode"
git push origin next
```

This push publishes nothing (the versions are already on `latest`), and the gate lets it through because `next` is back in pre mode.

## Adding a new package to the release line

A new published package needs one thing before its first release:

- Its first publish cannot be done locally with provenance, because provenance needs the CI OIDC environment. If you must publish it by hand once, use `pnpm publish --filter @seedcord/newpkg --no-provenance`. Prefer letting CI do it.

Confirm the package is public (the changesets config sets `access: "public"`) before the first publish.

## If a publish lands on the wrong tag

Move the tag. You cannot delete or replace the version itself.

```sh
npm dist-tag add seedcord@X.Y.Z latest
npm dist-tag ls seedcord
```

## Don't

- Don't run `changeset pre exit` or `release:version` on `next` to make a stable release. Graduate on `main` (Flow 2). The gate refuses a non-pre publish on `next`.
- Don't run `pnpm changeset version` directly. Node cannot load the TypeScript changelog module without `--import tsx`, and the changelogs skip the tidy pass.
- Don't run `npm publish` or `pnpm publish` by hand, except for a new package's first release. CI publishes through changesets.
- Don't push `main` while it is in pre mode. Exit pre mode first.
- Don't let a new changeset land between versioning and the publish. The gate skips the publish while one is pending, and the next versioning run bumps past the skipped version.
- Don't rename `.github/workflows/publish.yml`. Its filename is bound to the npm OIDC trust.

## Related

- Changesets prerelease docs, <https://github.com/changesets/changesets/blob/main/docs/prereleases.md>
- The publish workflow, `.github/workflows/publish.yml`, and its gate, `.github/actions/check-eligibility/action.yml`.
