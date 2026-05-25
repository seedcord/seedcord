# TODO 04: Dep bump — frontend ecosystem

## Overview

Bump frontend deps per `.vscode/docs/DEP_RESEARCH_FRONTEND.md`. The research recommends 5 commit groupings (patch sweep, tailwind minor, marked major, shiki major, lucide major). Apply them in that order so a failure isolates to its commit.

## Goals

1. **lucide-react 0.562 → 1.16.0** with the icon-rename / a11y sweep called out by the research.
2. **shiki 3 → 4** — verify CSS targeting shiki's emitted spans still works.
3. **marked 17 → 18** — TS 6 rebuild + trailing-newline drift fixed where renderer output is consumed.
4. **Tailwind 4.1 → 4.3** plus `prettier-plugin-tailwindcss` 0.7 → 0.8 — commit the prettier re-sort separately so the diff is reviewable.
5. **Next 16.1 → 16.2.6**, **React/react-dom 19.2.3 → 19.2.6**, **Radix patch sweep**, **zustand 5.0.13** — clean patches.

## Source of truth

`.vscode/docs/DEP_RESEARCH_FRONTEND.md`. Read before starting.

---

## Files to Change

### Files to MODIFY

| File                                                                                             | Change                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml`                                                                            | bump `react`, `frontend` bucket versions per research                                                                                                                               |
| `apps/docs/package.json`                                                                         | catalog references already in place from TASK-02; no per-pkg change beyond confirming                                                                                               |
| `apps/docs/src/components/**`                                                                    | grep `from 'lucide-react'` — rename / swap removed brand icons (Github → custom local SVG); add explicit `aria-label` on icon-only `<Button variant="ghost" size="icon">` instances |
| `apps/docs/src/lib/shiki.ts`                                                                     | likely no change (uses stable shiki APIs only); confirm                                                                                                                             |
| Any CSS targeting `.shiki span.line` etc. in `apps/docs/src/app/globals.css` and `utilities.css` | visual smoke after shiki 4 bump                                                                                                                                                     |
| `apps/docs/src/lib/docs/comments/**` (marked consumer)                                           | re-run after marked 18; check for trailing-newline-sensitive diffs                                                                                                                  |

### Files to CREATE

- `apps/docs/src/components/ui/GithubIcon.tsx` — already exists (`GithubIcon.tsx`); confirm it's a hand-rolled SVG, not a lucide brand icon. If lucide's, replace with hand-rolled.
- Same audit for Discord / Twitter / etc. brand icons used anywhere in apps/docs.

---

## Implementation Approach

### Commit 1 — patch sweep (safe)

Bump: react 19.2.6, react-dom 19.2.6, @types/react 19.2.15, @types/react-dom (latest patch), all `@radix-ui/*` to latest, next 16.2.6, zustand 5.0.13, clsx, tailwind-merge patches, cmdk patches.

```sh
# Update catalog
pnpm install
pnpm -C apps/docs lint:fix
pnpm -C apps/docs tc
pnpm -C apps/docs build
git commit -m "chore(deps): patch sweep for apps/docs frontend deps"
```

### Commit 2 — Tailwind 4.1 → 4.3 + prettier plugin 0.7 → 0.8

```sh
# Bump tailwind + plugin in catalog
pnpm install
pnpm -C apps/docs lint:fix
pnpm -C apps/docs tc
pnpm -C apps/docs build
# Re-sort caused by plugin 0.8 — separate it from the version bump for review:
git diff --stat
git add pnpm-workspace.yaml pnpm-lock.yaml package.json apps/docs/package.json
git commit -m "chore(deps): tailwindcss 4.1 → 4.3, prettier-plugin-tailwindcss 0.7 → 0.8"
git add apps/docs/src
git commit -m "style(apps/docs): re-sort tailwind classes per plugin 0.8"
```

### Commit 3 — marked 17 → 18

```sh
# Catalog bump
pnpm install
pnpm -C apps/docs tc        # marked rebuilt against TS 6 may surface type drift
# Manual verification — render a few tsdoc'd entities; compare against baseline samples
pnpm docs:smoke
git diff debugging/samples/ # check for whitespace drift
```

If trailing-newline trims affect any test fixture, update fixtures with the new shape (drift is intentional, not a regression).

```sh
git commit -m "chore(deps): marked 17 → 18 (trailing-newline drift in renderer output)"
```

### Commit 4 — shiki 3 → 4

```sh
# Catalog bump
pnpm install
pnpm -C apps/docs build
pnpm -C apps/docs dev &
# Manual: open a code-block page; verify highlighting renders identically
kill %1
```

If CSS targeting shiki span structure breaks visually, update `globals.css` / `utilities.css` to match v4's emitted classes.

```sh
git commit -m "chore(deps): shiki 3 → 4 (Node 18 dropped; v0.14 APIs pruned)"
```

### Commit 5 — lucide-react 0.562 → 1.16.0

1. `rg "from 'lucide-react'" apps/docs/src` — enumerate every icon used.
2. Cross-reference each name against the lucide v1 changelog (research doc lists removed icons).
3. For removed brand icons (Github, Discord, etc.), confirm `apps/docs/src/components/ui/GithubIcon.tsx` is a hand-rolled SVG (it appears to be; verify). Add `DiscordIcon.tsx` if needed.
4. For renamed icons, swap names.
5. **a11y sweep**: every `<Button variant="ghost" size="icon">` consumer must pass `aria-label="<verb>"`. lucide v1 makes `aria-hidden="true"` the default, so icons no longer provide an accessible name.
6. Build, manual smoke (open header — github icon visible — and search — cmdk icon visible).

```sh
git commit -m "chore(deps): lucide-react 0.562 → 1.16.0 + a11y sweep on icon buttons"
```

### Step 6 — Verify + changesets

```sh
pnpm prePush
# Add changeset for apps/docs only if a published package surface changed (it shouldn't have; apps/docs isn't published)
# If a published @seedcord/* package shifted, add changeset accordingly
```

---

## Acceptance Criteria

### Functional

- [ ] Every commit is independently `pnpm prePush`-green
- [ ] apps/docs visually renders identically (or intentionally updated) per shiki / lucide swap
- [ ] No console warnings about deprecated lucide icon names
- [ ] Every icon-only button has `aria-label`

### Code Quality

- [ ] No `// TODO: revisit lucide brand icon` left in code
- [ ] No `console.log` debug residue from manual smoking

### Publishing

- [ ] N/A (apps/docs is not published)

---

## Risks and Mitigation

| Risk                                                                  | Mitigation                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| lucide rename misses an icon → runtime crash on a page we don't visit | Grep exhaustively before commit; visual smoke every header / search / nav surface   |
| shiki v4 CSS structure breaks code-block contrast                     | Visual smoke against light + dark theme                                             |
| marked output drift breaks a test fixture                             | Update fixture in same commit; explain drift in commit body                         |
| Tailwind 4.3 introduces a class name conflict                         | Build smoke catches; `prettier-plugin-tailwindcss` re-sort surfaces unexpected ones |

---

## Related TODOs

- Blocked by: TASK-02 (catalog must exist)
- Blocks: TASK-09 (apps/docs quality fixes — many findings might already be obsolete after lucide/shiki bumps)

---

## Notes

- **Complexity:** Medium-high (multiple majors, manual visual smoke per)
- **Files affected:** workspace yaml + apps/docs source files where lucide / marked rendering changes
- **Touches published packages:** No
- **Estimated wall-clock:** 3-5 hours (mostly the manual smoke after each commit)

---

## Handoff

- 2026-05-25 — completed by Claude Opus on sub-branch `chore/dep-bump-batch-01-05`. Six commits: `847f520c` (patch sweep), `96f91f75` (tailwindcss 4.3 + plugin 0.8), `3aea1f2f` (marked 18), `cb34a2e1` (shiki 4), `d6402518` (lucide 1.16). Plus `21089c9e` fix-up for a mobile sidebar scroll regression that Tailwind 4.3 surfaced (root cause was apps/docs's `h-full` inside a `max-h-only` parent — undefined CSS behavior; Tailwind 4.3 enforces spec). Found via dual-worktree bisect (`tailwindcss@4.1.18` vs 4.3.0). Two pre-existing bugs surfaced and noted in MASTER_PLAN handoff for TASK-09: intermittent Sidebar SSR/client class-order hydration mismatch + low-framerate cmd-k animation. Also fixed a related pre-existing bug in `useSidebarScrollGuards.handleWheel` (was calling `stopPropagation()` BEFORE the scrollable check, dropping wheel events on non-scrolling viewports).
