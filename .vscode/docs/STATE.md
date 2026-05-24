# Seedcord — Back-Up-to-Speed (2026-05-24)

> Written after a 4-month gap since the last commit on `feat/better-api-extraction` (last commit `a6d1010d`, 2026-01-16). Read top-to-bottom; the order is: where you are right now → what this branch is doing → what's blocking → what to do next → broader v1.0.0 roadmap. Nothing in here is a plan I'm executing; it's a map.

---

## 0. URGENT — leaked secret in `TASKS.md`

`TASKS.md` line ~5 contains a live GitHub PAT (`[REDACTED-LEAKED-PAT-ROTATED]`) that you shared for one-time artifacts-repo testing. Since `TASKS.md` is in `.gitignore` it never reached the remote — confirmed via `git log -- TASKS.md` returning nothing — but the file lives on disk. **Rotate the PAT now** (revoke at <https://github.com/settings/tokens>) and either delete `TASKS.md` once the relevant asks are tracked elsewhere, or strip the token. After rotation, regenerate `ARTIFACTS_PAT` in repo secrets if it shared the value.

---

## 1. Right-now state (the tree you're looking at)

- **Branch:** `feat/better-api-extraction` → draft PR **#131** ("feat: better api extraction", +5554 / −1140 across 306 files vs `next`). Sibling draft PR **#130** ("feat: api docs updates", +1399 / −1089) on `feat/api-docs-updates` covers earlier doc work; #131 is the active branch.
- **Local vs remote:** ahead of `origin/feat/better-api-extraction` by 5 commits. Push when you're confident the migration we just did is what you want on the remote.
- **Working tree:** `AGENTS.md` modified + new untracked `.claude/`, `.github/agents/`, `.github/prompts/`, `.github/skills/`, `CLAUDE.md` symlink. All from today's agents-config migration from cancrops. Nothing else is dirty.
- **Branch is 42 commits ahead of `next`, 0 behind** (`git rev-list --left-right --count next...HEAD` → `0  42`). Rebase isn't needed before push, but `next` may have moved on the remote — re-check after pulling.
- **Default integration branch:** `next`. Releases happen off `main`. The `changesets/action@v1` step in `.github/workflows/publish.yml` only fires on push to `main`, so the path-to-release is `feat/* → next → main`.

---

## 2. What this branch is actually doing

The branch is two intertwined themes:

### Theme A — Public API surface reduction (across every package)

Most commits with `refactor:` or `refactor(WIP):` titles. Goal: trim what each package re-exports to only what consumers should touch. Already merged into the branch:

- `refactor(WIP): reducing the public api surface for seedcord` (`758b50ec`)
- `refactor: clean up Confirmable code (and improve it)` (`ee437d13`)
- `refactor: only export what's needed from injectors` (`b9aadc43`)
- `refactor(WIP): reduce seedcord exported entities` (`34ae346e`)
- `refactor(WIP): clean seedcord interface exports` (`4e87fe33`)
- `refactor(WIP): clean up services exports` (`457b5d2e`)
- `refactor(WIP): cleanup utils exports` (`e5cd0413`)

The corresponding changeset is `.changeset/whole-planes-push.md` (minor bumps for `seedcord`, `eslint-config`, `tsup-config`, `services`, `plugins`, `types`, `utils`, `cli` — "most packages were exporting more than what they should be exporting"). The pattern across packages is to split into a public `index.ts` (what consumers see) and an `internal.index.ts` (what siblings re-use). Already shipped on `seedcord`, `services`, `utils`, `types`.

### Theme B — Better API extraction + docs-engine maturity

Goal: make the doc generator/engine production-shaped before wiring CI/CD publish.

- `feat: fuzzy search in docs-engine and prettier format for signatures` (`12396f5e`) — closes #120 once #131 merges.
- `refactor: abstract search to its own class` (`a1244e11`) — extracted `Search.ts` (197 lines new).
- `tests: add api json generation tests` (`635ec2af`) — large new `packages/docs-generator/tests/` with `class`, `enum`, `function`, `interface`, `variable`, `type-alias`, `comments-tags`, `package-metadata`, `generator` test files plus mock harness in `tests/mock/`.
- `tests: add tests for inheritence and packagedoc` (`9fc70445`)
- `tests: some engine tests` (`1e7c3909`) — `ManifestReader`, `ProjectLoader`, `PackageDirectory`, `constants`, `kinds`, `mock-package`, `search`, `slugger` test files in `packages/docs-engine/tests/`.
- `refactor: cleanup nested interfaces so api docs can show comments correctly` (`cf4bce34`)
- `fix: missing throws tag rendering and incorrectly rendered code blocks in comments` (`d7c8f513`)
- `style:` and `refactor:` commits on `apps/docs` polishing the search button, transitions, fragmented styling, `tw` helper usage.

The 16 pending changesets in `.changeset/` show the full set of bumps queued for the next publish: `whole-planes-push.md` (export reduction, minor), `clever-tips-enjoy.md` (BREAKING: config.ts dev-server + new CLI, minor seedcord+cli), `forty-phones-run.md` (new Logger custom sink transport, minor services), `cozy-donkeys-drive.md` (SeedcordBrand, minor seedcord+utils), and several patches for typings, fixes, dep bumps, and the `version` runtime export across every package.

---

## 3. What's still open on this branch (from `TASKS.md`)

The top of `TASKS.md` has five active asks the previous-you flagged and almost certainly hasn't fully addressed yet:

1. **Docs URLs are ugly.** Examples in `TASKS.md` line 5–6:
    - `…/classes/autocomplete-handler#constructor-autocomplete-handler/constructor` — duplicate `/constructor` segment.
    - `…/functions/check-permissions#check-permissions#checkPermissions-18o3wj0` — duplicate fragment + hash garbage suffix.
      Goal: simpler URLs. Add tests that walk every entity kind (class / interface / enum / function / type alias / variable / member overloads) and assert URL shape. The new `packages/docs-engine/src/Slugger.ts` + `tests/slugger.test.ts` are the natural place; extend `tests/mock-package.test.ts` for end-to-end shape.
2. **`scripts/` folder lint:fix / tc don't run from root.** The root `pnpm lint:fix` / `pnpm tc` go through turbo and only hit workspace packages; `scripts/` is loose tsx files (`extract-docs.ts`, `create-ts-files.sh`, `kill-seedcord.sh`). Add `lint:fix:scripts` and `tc:scripts` in root `package.json` that target `scripts/**/*.{ts,tsx}` with the root ESLint + TS config, and wire them into `prePush`.
3. **Artifacts repo (`github.com/seedcord/artifacts`) needs to be populated** with the per-package per-version `api.json` plus an `index.json` (shape sketched at the bottom of `TASKS.md`). And the docs CI/CD must:
    - Fetch the current index for the artifacts repo via jsDelivr CDN (no hardcoded package list, no hardcoded versions — read from the index).
    - After a successful publish on `main`, diff git tags vs index to find new versions per package, check out each new tag, run the generator scoped to that package, push the resulting `api.json` to the artifacts repo, and update `index.json`.
    - Token: `ARTIFACTS_PAT` is already in repo secrets (per `TASKS.md`).
4. **`DOCS_SYSTEM.md` has hallucinated `NEXT_*` env vars** that aren't actually used. Find them with `rg 'NEXT_'` in that file, confirm they're not referenced elsewhere, delete or replace with the real env contract.
5. **The new docs CI is long and ugly.** Two specific complaints:
    - Install `tsx` once at the top instead of `npx tsx` per step.
    - Lift repeated logic into composite actions in `.github/actions/`. The pattern already exists — see `.github/actions/{docs-extract,setup,turbo-cache}/action.yml`. Audit `.github/workflows/publish.yml` and any new docs workflow for repetition that belongs in a new composite.

Then **everything below `---` in `TASKS.md`** is from a previous prompt and is "many of them still not done." Key ones:

1. **Version-aware docs.** Generator must accept "where to find the source for package X" so CI can `git checkout <tag>` and emit `api.json` for that exact tag. Local dev still defaults to "all packages from working tree." Look at `packages/docs-generator/src/{workspace.ts,paths.ts}` for the entry surface; today they assume `packages/`.
2. **`docs-engine` runtime in `apps/docs`** should hold a singleton with a per-package version setter. On version change, pull the matching `api.json` from jsDelivr, rebuild the in-memory index for that package, swap it in. Search must span all currently-selected package versions, not just one package.
3. **Engine should pull from `index.json`** to populate the version dropdown (the "• latest" affordance already exists in the UI).
4. **Cross-package reference bug in `apps/docs`:** selecting an entity from another package while viewing seedcord should keep seedcord selected and link out — it currently switches the active package. Same fix needed on search results. Likely candidates to grep: `apps/docs/src/lib/docs/resolveReferenceHref.ts`, `apps/docs/src/components/docs/entity/`.
5. **Inline vs block DocComment tags.** Right now `@link` may be misclassified as block. Audit every consumer of `DocComment`/`@link`/`@inline` in `packages/docs-generator/src/extractor.ts` and `packages/docs-engine/src/transformers/`. The user wants a non-fragile classification, not a band-aid.
6. **`apps/docs/src/lib/docs/`** — move what belongs to the engine into `@seedcord/docs-engine` and delete unused code. Pre-merge cleanup.
7. **Vercel deploy-readiness for `apps/docs`** pulling from the actual artifacts repo. No manual env wiring.

There's also a "create a new `.md` file in this folder with every SINGLE thing I need to know for using the new system" line at the end — that should land as `.vscode/DOCS_SYSTEM.md` (or update the existing one) after the artifacts pipeline is real.

---

## 4. Build / test health right now

I did not re-run the gates as part of this session. Before you start changing code:

```sh
pnpm install                       # ensure lock + node_modules current
pnpm tc                            # workspace-wide typecheck via turbo
pnpm lint:fix                      # workspace-wide lint:fix via turbo
pnpm test                          # workspace-wide vitest
pnpm prePush                       # full gate: build + tc + lint + test
```

Hot spots to look at if anything red flags:

- `packages/docs-engine/tests/` and `packages/docs-generator/tests/` are new and brittle — the mock harness in `tests/mock/` uses `tests/utils/globalSetup.ts` and a local `tsconfig.json`. The most recent fix (`14c4d98d`) was a default-effect color fix for `UnknownException.ts`; the test runs for that effect should be green.
- `packages/services/tests/logger/` was reshaped in `b044d967`. Re-run those after any logger touchup.
- `packages/cli/tests/hmr.test.ts` is new and exercises the HMR plumbing that landed with `feat/hmr` (#129, merged into `next`).

---

## 5. What ships on this branch vs what's deferred

The PR labels on **#131** show the surface area: `pkg:cli`, `pkg:docs-generator`, `pkg:eslint-config`, `pkg:mock`, `pkg:plugins`, `pkg:seedcord`, `pkg:services`, `pkg:tsconfig`, `pkg:tsup-config`, `pkg:types`, `pkg:utils`, `area:ci`, `area:config`, `area:docs`, `area:tests`, `type:feature`.

**My read on what belongs in #131** (don't expand scope):

- ✅ Public-API-surface reduction across all packages (Theme A — mostly done, finish utils/services if WIP).
- ✅ New docs-engine + docs-generator tests (Theme B — done).
- ✅ Search refactor + fuzzy search (`12396f5e`).
- ✅ Signature pretty-printing and throws/code-block rendering fixes.
- ✅ Frontend polish (transitions, search button border, fragmented styling).
- ✅ `tsdoc.json` config addition for the `@inferred` custom tag (`e06a6478`) — corresponds to **#119**.
- ❓ **URL simplification + tests (TASKS.md item 1)** — this is in-scope for the PR title ("better api extraction") and worth doing before merge. Plan to do it next session.
- ❓ **scripts/ lint+tc scripts (TASKS.md item 2)** — small chore; can ride along on this PR or split out.
- ❌ **Artifacts repo + CI/CD publish pipeline (TASKS.md items 3, 5, 6, 7, 8, 12)** — these are large enough to deserve their own PR. Land #131 first, then open `feat/docs-publish-pipeline` (or similar).
- ❌ **Cross-package reference bug (TASKS.md item 9)** — frontend-only fix; can be its own small PR.
- ❌ **Inline-vs-block tag classification (TASKS.md item 10)** — research task; defer until you can scope it.
- ❌ **`DOCS_SYSTEM.md` hallucination fix (TASKS.md item 4)** — `DOCS_SYSTEM.md` doesn't exist in the tree right now; either find it on a feature branch or create it as part of the artifacts pipeline PR.

---

## 6. Open GitHub issues — the v1.0.0 surface

There are 30 open issues. They were derived from `debugging/ISSUE_PROPOSAL.md` (632 lines, written 2025-12-24, 27 proposed issues) and the human-readable plan in `debugging/ISSUE_PLAN_HUMAN.md`. The grouping I'd carry in your head:

### v1.0.0 blockers (close before tagging 1.0)

| #    | Title                                                          | Notes                                          |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- |
| #101 | ComponentsV2 error handling support (core)                     | Parent for #102 / #103 / #104                  |
| #102 | CustomError response should accept ComponentsV2                | API change, breaking                           |
| #103 | Catchable decorator should deliver ComponentsV2 responses      |                                                |
| #104 | EventCatchable decorator should deliver ComponentsV2 responses |                                                |
| #106 | Handler priorities and multi-handler routes                    | Parent for #107 / #108                         |
| #107 | Multi-handler support for interaction routes                   |                                                |
| #108 | Priority support on handlers                                   |                                                |
| #111 | Typed custom id utilities                                      | Generic `getArg` / `buildCustomId`             |
| #117 | Wire CI/CD publish (docs)                                      | `feat/better-api-extraction` plus follow-up PR |
| #120 | Fuzzy search in docs                                           | Done in `12396f5e` — close on merge of #131    |
| #53  | API Documentation                                              | Umbrella for the whole docs system             |

HMR (#90 / `feat/hmr`) and the new CLI (#38, #98, #100) were the previous milestone push and landed in `next`.

### v1.1.0 candidates

- #109 Pre-conditions decorators
- #110 Custom error throwing hook
- #112 Duplicate command cleanup tool (CLI)
- #115 DatabaseError default effect
- #118 Signature formatting for docs (LOW — possibly already done)
- #119 TSDoc `@inferred` tag support (scaffold present via `tsdoc.json` + `e06a6478`)
- #128 Populate + Catchable sync support

### Research / "maybe" pile

- #126 Multi-bot support in one project (defer — breaking, V2)
- #127 REST-only interactions integration (defer — V2)
- #132 Toggle to hide `@internal` members in docs (new, 2026-01-08)
- #113 Emoji injection redesign (needs writeup)
- #122 Package metadata refresh
- #123 Prettier-only formatting workflow
- #124 TS `importHelpers` evaluation
- #125 PR and Issue templates

A v1.0.0 release target of Q1 2026 was the original goal (per `README.md` and `debugging/ISSUE_PROPOSAL.md`). We're past Q1 now. Either retarget the README or scope-cut. The realistic v1.0.0 critical path today, ordered:

1. **Land #131 (`feat/better-api-extraction`)** — finish URL cleanup + scripts/ tooling, merge to `next`.
2. **#117 CI/CD publish pipeline** — artifacts repo + workflow (TASKS.md items 3, 5–8, 12).
3. **#101 / #102 / #103 / #104 ComponentsV2 error handling** — core framework change, blocks 1.0 because it's breaking.
4. **#106 / #107 / #108 handler priorities + multi-handler routes** — also breaking.
5. **#111 typed custom-id utilities.**
6. **#43 pre-built components library** (Spacer, Paginator, Confirm, Iterable select).
7. **#40 user guide / `apps/guide`** — currently a `.gitkeep`. Big content lift.
8. **Tag `v1.0.0`** and update `README.md`.

Items 3–7 are independent enough to parallelize across branches once #131 + #117 land.

---

## 7. Repo / surface refresher (skim if you don't trust your memory)

- **Workspace layout:** `packages/{cli, docs-engine, docs-generator, eslint-config, plugins, seedcord, services, tsconfig, tsup-config, types, utils}` + `apps/{docs, guide, home}` + `mock/` (runnable Discord bot for exercising the framework) + `debugging/` (gitignored scratch + scripts for issue creation, see `debugging/src/{createIssues.ts, fetchIssues.ts}`).
- **Apps:** `apps/docs` is the only populated one. `apps/guide` and `apps/home` are placeholders (`.gitkeep` only).
- **CLI lives in `packages/cli`** built on `commander` + `@commander-js/extra-typings` + `ink` + `ink-spinner`. `bin/seedcord.mjs` is the entry. HMR (vite-based) recently landed via #129; see `packages/cli/tests/hmr.test.ts`.
- **Mock bot:** `mock/` builds and runs as `@seedcord/mock`. Use it as the integration harness for any framework change.
- **Workflows:** `.github/workflows/{tests,publish,commitlint,pr-labeler,type-labeler,label-sync,cleanup-cache}.yml`. `publish.yml` runs on workflow_run from `tests` on `main`, uses changesets to publish to npm. `tests.yml` runs on PR + push + merge_group with paths-ignore for docs/markdown.
- **Composite actions:** `.github/actions/{docs-extract, setup, turbo-cache}`. New CI work should add composites here, not inline shell.
- **Catalogs:** `pnpm-workspace.yaml` pins `chalk`, `discord.js 14.25.1`, `envapt`, `mongoose 9.0.2`, `prettier 3.7.4`, `reflect-metadata 0.2.2`, `type-fest 5.3.1`, `typedoc 0.28.15`, `vite 7.3.0`, `react 19.2.3`, `@types/react 19.2.7` under `deps`; `eslint 9.39.2`, `typescript 5.9.3`, `tsup 8.5.1`, `tsx 4.20.6` under `peer`.
- **Doc generation flow today:** `pnpm docs:extract` (= `tsx scripts/extract-docs.ts -o ./generated -p ./packages`) walks `packages/`, uses `@seedcord/docs-generator` to produce `api.json` per package into `generated/`. `pnpm docs:smoke` chains that with `@seedcord/docs-engine`'s smoke pass writing into `debugging/samples/` (where you can eyeball per-kind output). `apps/docs` consumes the engine at runtime via `apps/docs/src/lib/docs/engine.ts` + `catalog.ts` (the hardcoded version/package map that needs to die per TASKS.md item 3).
- **Agents config (today's migration):** `AGENTS.md` is now the sectioned cancrops-style source of truth; `CLAUDE.md` → `AGENTS.md` symlink; `.claude/skills` → `../.github/skills` symlink. Agents live under `.github/{agents,prompts,skills}`. `.claude/hooks/{filter-test-output.sh,settings.json}` are reference copies for the user-level hook setup. `.claude/settings.local.json` enables sandbox mode.

---

## 8. Recommended next session (concrete, single-thread)

If you've got one focused work block before you need to context-switch:

1. **Rotate the leaked PAT in `TASKS.md` (5 min).**
2. **Commit today's agents-config migration as a standalone chore commit** so the WIP feature work isn't mixed with infra. Suggested message: `chore: migrate agent guidelines, skills, and Claude Code config`. Keep `TASKS.md` out of the commit (it's gitignored anyway).
3. **Run `pnpm install && pnpm prePush`** to confirm nothing rotted in 4 months.
4. **Pick TASKS.md item 1 (URL simplification + tests)** as the next code change — it's well-scoped, the test scaffolding already exists in `packages/docs-engine/tests/`, and it's clearly in-scope for `feat/better-api-extraction`. Fixing it gets #120 closed-on-merge and tightens the surface before any CI work consumes the URLs.
5. **Push, mark PR #131 ready for review** once the URLs and `scripts/` tooling land.
6. **Then** open `feat/docs-publish-pipeline` for the artifacts-repo + CI/CD chunk (TASKS.md items 3, 5–8, 12).

Don't try to do the v1.0.0 blocker work (ComponentsV2 / multi-handler / typed custom-ids) on this branch — those are independent breaking changes that each deserve their own PR + changeset story.

---

## 9. Things this doc deliberately does NOT cover

- Detailed designs for ComponentsV2 error handling, multi-handler routing, or typed custom-ids — see the corresponding GitHub issues (#101, #106, #111) and `debugging/ISSUE_PROPOSAL.md` for the original analysis.
- Anything in `debugging/` other than the issue planning files. `debugging/samples/` is just per-kind doc output; `debugging/src/` is one-shot issue-creation scripts.
- Configuration deep-dives for ESLint, TSConfig, Tsup, Prettier, lint-staged, husky, commitlint — these are stable and were tightened on `next` before this branch forked. If you suspect drift, diff `pnpm-lock.yaml` against `main` after `pnpm install`.
