# TODO 16: apps/docs UI — package picker + version dropdown driven by index.json

## Overview

Build the user-visible package + version selection that drives the rest of the docs UX:

- Package picker (header dropdown) — lists every package in `index.json`
- Per-package version dropdown — lists every version with `• latest` decoration on newest stable; prereleases tagged
- Selecting a (pkg, version) hits `engine.setVersion(pkg, version)`, swapping the active project.json

## Goals

1. **Discovery from `index.json`** — no hardcoded list in `catalog.ts`. The current hardcoded version map gets deleted.
2. **Versions list per package** — fetch from the index entry; sort stable descending (semver-aware), prereleases separately.
3. **`• latest` decoration** on newest stable in the dropdown.
4. **Smooth swap** — selecting a version shows a loading state while the new project.json fetches; no full-page reload.
5. **URL alignment** — selecting a version updates the route's `versionId` segment.

## Files to Change

### Files to DELETE

- `apps/docs/src/lib/docs/catalog.ts` (hardcoded package list — replaced by index.json-driven discovery)

### Files to MODIFY

| File                                                                                     | Change                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/src/lib/docs/engine.ts`                                                       | wire engine to `IndexLoader`; expose hooks (`usePackages`, `useVersions(pkg)`, `useActiveVersion(pkg)`, `setActiveVersion(pkg, version)`) |
| `apps/docs/src/store/ui.ts`                                                              | add `activePackage` + `activeVersions: Record<string, string>` state                                                                      |
| `apps/docs/src/components/header/**`                                                     | replace static label with `<PackagePicker />` and `<VersionDropdown />`                                                                   |
| `apps/docs/src/components/header/PackagePicker.tsx`                                      | new (or extracted)                                                                                                                        |
| `apps/docs/src/components/header/VersionDropdown.tsx`                                    | new                                                                                                                                       |
| `apps/docs/src/app/docs/packages/[packageId]/[versionId]/[[...entitySegments]]/page.tsx` | resolve `[packageId]` + `[versionId]` against index; trigger `setVersion` before render                                                   |

### Files to CREATE

- `apps/docs/src/components/header/PackagePicker.tsx`
- `apps/docs/src/components/header/VersionDropdown.tsx`
- `apps/docs/src/lib/docs/hooks.ts` (if not present) — `usePackages`, `useVersions`, `useActiveVersion`, `setActiveVersion`

---

## Implementation Approach

### Step 1 — Engine wiring at SSR

Next.js 16 server components can call `engine.setVersion(pkg, version)` during route resolution. The page's `generateMetadata` or top-of-component code awaits the version load before rendering entity content. Use `next/cache` cache tags so the SSR cache invalidates when `index.json` updates.

### Step 2 — Package + version semantics

- "latest" is a special version label. URLs like `/docs/packages/seedcord/latest/...` resolve at request time via `IndexLoader.resolveVersion(pkg, 'latest')`.
- Explicit version URLs (`/docs/packages/seedcord/0.10.6/...`) bypass the `latest` resolution.

### Step 3 — Dropdown UI

Use existing Radix dropdown primitive from `apps/docs/src/components/ui` (likely the dialog or dropdown-menu). Match the design fidelity of the rest of the header.

Display rules:

- Stable versions, descending semver
- Prereleases below stable, separated by a `<DropdownMenuSeparator />`
- Newest stable: `<span className="text-(--accent-a)"> • latest</span>` suffix
- Currently selected: checkmark / highlight per Radix conventions

### Step 4 — Loading state

When the user selects a new version:

1. Show loading skeleton on the entity panel (the page content area)
2. `setVersion` resolves
3. The engine emits an "active changed" event; the page re-reads `useActiveVersion(pkg)` and re-renders

### Step 5 — Delete catalog.ts

After `engine.ts` no longer imports from `catalog.ts`, `git rm` it. Any imports elsewhere need rewriting to `usePackages()`.

### Step 6 — Tests

- Vitest + RTL test for `PackagePicker` rendering the index packages list
- Vitest + RTL test for `VersionDropdown` showing latest decoration on newest stable
- Integration smoke (manual): pick a different version → entity content updates

---

## Acceptance Criteria

- [ ] `apps/docs/src/lib/docs/catalog.ts` does not exist
- [ ] `<PackagePicker />` shows every package in `index.json`
- [ ] `<VersionDropdown />` shows stable versions descending, prereleases separately, latest marked
- [ ] Selecting a version updates URL + content without full reload
- [ ] `pnpm -C apps/docs build` clean
- [ ] Manual smoke matches design

---

## Risks and Mitigation

| Risk                                                       | Mitigation                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| index.json fetch fails on first load → blank app           | Render a fallback UI explaining the state, with retry button                                      |
| Selecting a missing/yanked version → 404 in jsDelivr       | Engine throws `PackageVersionNotFoundError`; UI catches + shows a toast                           |
| Semver sort with prereleases (1.0.0-next.2 vs 1.0.0) wrong | Use `semver` from `type-fest` or pull in `semver` as a frontend dep; test with mixed-tag fixtures |

---

## Related TODOs

- Blocked by: TASK-15 (engine `setVersion` exists), TASK-18 (artifacts repo seeded so index.json has content to render)
- Blocks: TASK-17 (cross-pkg new-tab depends on PackagePicker being canonical)

---

## Notes

- **Complexity:** Medium-high (Next.js + Radix + engine coordination)
- **Files affected:** ~8-12
- **Touches published packages:** No
- **Estimated wall-clock:** 5-8 hours
