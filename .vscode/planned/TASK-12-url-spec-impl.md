# TODO 12: URL spec implementation + acceptance tests

## Overview

Implement `.vscode/docs/URL_SPEC.md`. Two concrete bugs:

1. **djb2 hash in fragment** — `packages/docs-engine/src/transformers/mappers.ts:255-264` generates `#checkPermissions-18o3wj0` style fragments. Replace with the existing 1-based `overloadIndex` → `#overload-N`.
2. **Parent slug duplication in member fragments** — `apps/docs/src/lib/docs/resolveReferenceHref.ts:96` composes fragment as `#constructor-${node.slug}` where `node.slug` is `autocomplete-handler/constructor`, producing `#constructor-autocomplete-handler/constructor`. Strip parent slug before composing.

Plus: acceptance tests per the spec.

## Source of truth

`.vscode/docs/URL_SPEC.md` — every invariant, fragment grammar, and test stub.

---

## Files to Change

### Files to MODIFY

| File                                               | Change                                                                                                                                  | Why                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `packages/docs-engine/src/transformers/mappers.ts` | Replace `sigFragment` djb2 with `overloadIndex`; update `registerSignatureFragment` + `mapSignature` callers; drop `HASH_BASE` constant | Kill hash garbage               |
| `apps/docs/src/lib/docs/resolveReferenceHref.ts`   | Add `memberLocalSlug` helper; update `buildMemberHrefFromNode` (line ~96) + `buildParameterAnchor` (line ~114)                          | Strip parent slug from fragment |
| `apps/docs/src/lib/docs/routes.ts`                 | Possibly export fragment-building helpers (if refactor extracts them); otherwise no change                                              | Centralize fragment composition |
| `packages/docs-engine/src/index.ts`                | If member URL builder moves to engine (per TASK-13's cleanup map), export it                                                            | Cleanup precondition            |

### Files to CREATE

- `packages/docs-engine/tests/url-spec.test.ts` — implements every acceptance test in URL_SPEC.md
- `packages/docs-generator/tests/url-fragment.test.ts` — asserts generator emits stable `overloadIndex` fragments

---

## Implementation Approach

### Step 1 — Generator-side fix (`mappers.ts`)

Replace lines 255-264:

```ts
// Before
function sigFragment(signature: SignatureReflection): string {
    const name = signature.name;
    const params = (signature.parameters ?? []).map((p) => typeToken(p.type)).join(',');
    const ret = typeToken(signature.type);
    let hash = 5381;
    for (const ch of `${name}|${params}|${ret}`) {
        hash = (hash << 5) + hash + ch.charCodeAt(0);
    }
    return `${name}-${(hash >>> 0).toString(HASH_BASE)}`;
}

// After
function sigFragment(_signature: SignatureReflection, overloadIndex: number, totalSignatures: number): string {
    return totalSignatures > 1 ? `overload-${overloadIndex + 1}` : '';
}
```

Update `registerSignatureFragment` to accept `(signature, overloadIndex, total)`. Update `mapSignature` (already takes `index`) to pass it through. Drop `HASH_BASE` constant (look for unused export).

### Step 2 — Engine-side: ensure no consumer relies on hash fragment shape

```sh
rg "overload-[a-z0-9]{6,}" packages/docs-engine/src packages/docs-generator/src apps/docs/src
```

Should return nothing. Anything matching is stale and needs updating.

### Step 3 — apps/docs member URL fix (`resolveReferenceHref.ts`)

Add at top of file (or move to `routes.ts` per cleanup map):

```ts
function memberLocalSlug(memberFullSlug: string, parentFullSlug: string): string {
    if (memberFullSlug.startsWith(`${parentFullSlug}/`)) {
        return memberFullSlug.slice(parentFullSlug.length + 1);
    }
    return memberFullSlug; // defensive — should not happen in valid extractions
}
```

In `buildMemberHrefFromNode` (around line 90-96), replace:

```ts
// Before
const anchorPrefix = MEMBER_ANCHOR_PREFIX[nodeKind];
return anchorPrefix ? `${entityHref}#${anchorPrefix}-${node.slug}` : entityHref;

// After
const localSlug = memberLocalSlug(node.slug, entityNode.slug);
const anchorPrefix = MEMBER_ANCHOR_PREFIX[nodeKind];
return anchorPrefix ? `${entityHref}#${anchorPrefix}-${localSlug}` : entityHref;
```

In `buildParameterAnchor` (around line 114), same treatment for the `parentSlug` path.

### Step 4 — Acceptance tests

Create `packages/docs-engine/tests/url-spec.test.ts` per URL_SPEC.md's "Acceptance tests" section. Use the `tests/mock-package` fixture if it has signature-rich entities; if not, add fixtures.

Tests must verify:

- Constructor → `#constructor` (no `-classname/constructor` duplication)
- Single-signature function → no fragment
- 3-overload function → `#overload-1`, `#overload-2`, `#overload-3`
- Stability across two extractions of the same fixture
- No duplicate URL segments
- No djb2-style hash garbage in fragments
- Member URL excludes parent slug

Create `packages/docs-generator/tests/url-fragment.test.ts` that:

- Generates a project.json from a fixture with multi-overload function
- Asserts the fragment is `overload-N`, not a hash

### Step 5 — Run + commit

```sh
pnpm -C packages/docs-engine lint:fix && tc && test
pnpm -C packages/docs-generator lint:fix && tc && test
pnpm -C apps/docs lint:fix && tc
pnpm docs:smoke
git diff debugging/samples/  # confirm sample drift is just fragment shape changes
git commit -m "fix(docs): URL spec — kill djb2 hash + strip parent slug from member fragments"
```

Changesets:

- `@seedcord/docs-engine` minor (URL output shape changes; downstream consumers may have bookmarks)
- `@seedcord/docs-generator` minor (project.json fragment field shape changes)

---

## Acceptance Criteria

### Functional

- [ ] No URL produced by the system contains a djb2-style hash (`/-[a-z0-9]{6,}$/`)
- [ ] No URL has duplicate segments across path + fragment
- [ ] Constructor URL is `/.../classes/<slug>#constructor` exactly
- [ ] N-overload function URLs are `/.../functions/<slug>#overload-1..N`
- [ ] Every acceptance test in URL_SPEC.md passes
- [ ] `pnpm docs:smoke` produces samples whose URLs match the spec

### Code Quality

- [ ] `HASH_BASE` constant is removed if unused
- [ ] `sigFragment` is no longer exported (or, if it must be, only the new shape is)
- [ ] No new test fixtures with hash-style fragments

### Publishing

- [ ] Changesets: minor on `@seedcord/docs-engine` and `@seedcord/docs-generator`
- [ ] Changeset body explains the URL shape change for downstream docs

---

## Testing Requirements

Per URL_SPEC.md "Acceptance tests" section — full coverage of the invariants.

---

## Risks and Mitigation

| Risk                                                                                           | Mitigation                                                                                           |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Existing apps/docs deep-links (search index, sitemap) reference old hash URLs                  | Document the URL shape change in the changeset body; URLs are stable from this PR forward            |
| Stable-across-extraction invariant fails because typedoc ordering isn't deterministic          | Investigate the actual ordering; if non-deterministic, sort by name (alphabetical) in the index step |
| The cleanup map (TASK-13) moves `resolveReferenceHref` to the engine, conflicting with this PR | Land TASK-12 first; TASK-13 picks up the file in its new state                                       |
| Existing apps/docs deep-links (search index, sitemap) reference old hash URLs                  | Document the URL shape change in the changeset body; URLs are stable from this PR forward            |
| Stable-across-extraction invariant fails because typedoc ordering isn't deterministic          | Investigate the actual ordering; if non-deterministic, sort by name (alphabetical) in the index step |
| The cleanup map (TASK-13) moves `resolveReferenceHref` to the engine, conflicting with this PR | Land TASK-12 first; TASK-13 picks up the file in its new state                                       |

---

## Related TODOs

- Blocked by: TASK-11 (framework quality findings may overlap with `mappers.ts`)
- Blocks: TASK-13 (lib/docs cleanup), TASK-15 (engine consumers expect stable fragments)

---

## Notes

- **Complexity:** Medium (mechanical fixes, comprehensive tests)
- **Files affected:** 2 modify + 2 new test files
- **Touches published packages:** Yes — changesets minor on docs-engine + docs-generator
- **Estimated wall-clock:** 3-4 hours
