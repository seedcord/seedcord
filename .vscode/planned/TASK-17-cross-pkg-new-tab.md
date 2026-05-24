# TODO 17: apps/docs UI — cross-pkg link → new tab + search scoped to selected version

## Overview

Two related UI behaviors:

1. **Cross-package links open in new tab.** When viewing seedcord and a tsdoc reference points to `@seedcord/utils`, the link opens in a new tab. Current tab's active package stays on seedcord. This was the user's locked-in cross-pkg UX from grilling.
2. **Search and entity nav scoped to the currently-selected (pkg, version).** No cross-version aggregation. No cross-package results unless the user is on the package picker. Overrides earlier `TASKS.md` item 7.

## Goals

1. Every entity-page link component checks `targetPackage !== currentPackage`. If so, adds `target="_blank" rel="noopener noreferrer"`. Visual indicator (external-link icon, subtle).
2. Search (cmdk-driven) queries only the active package's loaded project, at the active version.
3. Sidebar nav (entity tree on the left) shows only entities from the active (pkg, version).

## Files to Change

### Files to MODIFY

| File                                                                    | Change                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/docs/src/components/docs/entity/<EntityLink>.tsx` (or equivalent) | adds `target="_blank"` conditionally                                            |
| `apps/docs/src/components/search/**` (cmdk command palette)             | scope query to active project                                                   |
| `apps/docs/src/components/docs/<EntitySidebar>.tsx` (or equivalent)     | render only active package's directory                                          |
| `apps/docs/src/lib/docs/hooks.ts`                                       | add `useActiveProject()` returning the current loaded project                   |
| `packages/docs-engine/src/services/Search.ts`                           | confirm `Search` is per-project, not cross-project (audit suggests it might be) |

### Files to CREATE

None expected.

---

## Implementation Approach

### Step 1 — Cross-pkg new-tab

In the link-rendering component (likely composed via `resolveReferenceHref` returning a `targetPackage` along with the URL):

```tsx
export function EntityLink({ href, targetPackage, currentPackage, children }: Props) {
    const isCrossPkg = targetPackage && targetPackage !== currentPackage;
    return (
        <Link
            href={href}
            target={isCrossPkg ? '_blank' : undefined}
            rel={isCrossPkg ? 'noopener noreferrer' : undefined}
            className={cn(BASE, isCrossPkg && CROSS_PKG_INDICATOR)}
        >
            {children}
            {isCrossPkg && <ExternalLinkIcon className="ml-1 inline size-3 align-baseline" />}
        </Link>
    );
}
```

`resolveReferenceHref` in `@seedcord/docs-engine` (post-cleanup in TASK-13) should return an object: `{ href, targetPackage, version, kind }` so the consumer can decide.

### Step 2 — Search scoping

Confirm `packages/docs-engine/src/services/Search.ts` is constructed per-project. If it's global (one search index across all loaded projects), scope it. The cmdk command palette should query `useActiveProject()?.search(query)`.

### Step 3 — Sidebar nav scoping

`<EntitySidebar />` should consume `useActivePackage()`'s `PackageDirectory.snapshot()`, not a cross-package aggregate.

### Step 4 — Tests

- RTL: cross-pkg link renders with `target="_blank"`; same-pkg link does not
- Integration: change active version, search returns the new version's results

---

## Acceptance Criteria

- [ ] Clicking a cross-pkg reference opens a new tab
- [ ] Clicking a same-pkg reference navigates in-tab
- [ ] Search results are filtered to active (pkg, version)
- [ ] Sidebar shows only active pkg's entities
- [ ] `pnpm prePush` clean
- [ ] Visual smoke matches design

---

## Risks and Mitigation

| Risk                                                                                                      | Mitigation                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Some link composers don't go through the shared `<EntityLink>` (e.g. tsdoc renderer directly emits `<a>`) | grep `<a` in tsdoc renderers; unify on `<EntityLink>`                     |
| Search engine reuses indexes across projects internally → memory leak                                     | Confirm via `Search.ts` audit; if cross-project shared, scope per-project |
| External (non-`@seedcord/*`) links also need `target="_blank"`                                            | They already do (rawExternalLinks layer); confirm                         |

---

## Related TODOs

- Blocked by: TASK-13 (lib/docs cleanup moves the link component to the engine surface), TASK-16 (picker provides active pkg context)
- Blocks: nothing critical

---

## Notes

- **Complexity:** Medium
- **Files affected:** ~5-10
- **Touches published packages:** Maybe — if `resolveReferenceHref` shape changes from `string` to object, `@seedcord/docs-engine` minor
- **Estimated wall-clock:** 3-5 hours
