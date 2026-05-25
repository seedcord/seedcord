# apps/docs — Code Quality Audit

**Audited:** 2026-05-24
**Surface:** apps/docs/src/\*\*
**Files scanned:** 153 (ts/tsx/css)

---

## HIGH Severity (block merge)

### H1 — `tw` template tag silently swallows every interpolated value

**Location:** `apps/docs/src/lib/utils.ts:13`
**Rule:** AGENTS.md — Zero Technical Debt; FAIL-FAST-RULES
**Problem:** `toTokens` has inverted logic: `if (value || value === false) return [];` returns `[]` for every truthy value, so any `${...}` interpolation inside a `` tw`...` `` template is dropped. The intent is clearly the opposite (return early on falsy, _not_ truthy). The function only works today because every caller currently uses static templates — the moment anyone adds an interpolation it will fail silently with no type or runtime error.
**Fix:** Invert the guard.

```ts
const toTokens = (value: unknown): string[] => {
    if (value === false || value == null) return [];
    if (Array.isArray(value)) return value.flatMap(toTokens);
    return String(value).split(/\s+/);
};
```

**Auto-fixable:** yes

### H2 — `as unknown as DocNode` double-cast on signatures in two builders

**Location:** `apps/docs/src/lib/docs/builders/buildSignatureDetails.ts:119`, `apps/docs/src/lib/docs/builders/buildFunctionSignature.ts:36`
**Rule:** AGENTS.md "No `as unknown as T` double casts" / TYPESCRIPT.md
**Problem:** `buildDeprecationStatusFromNodeLike(signature as unknown as DocNode)` lies about the type. `DocSignature` shares `flags`, `comment.blockTags`, etc. with `DocNode` but is not assignable. The helper only reads `flags.isDeprecated` and `comment?.blockTags`, so the right fix is widening the helper's parameter type, not casting the caller.
**Fix:** Change `buildDeprecationStatusFromNodeLike` in `builders/utils.ts` to accept `{ flags: { isDeprecated?: boolean }; comment?: DocComment | undefined }` (or a small inline interface / shared `DocNodeLike` alias) and drop both casts.
**Auto-fixable:** no (type design change)

### H3 — Five more `as unknown as` double casts to satisfy `ActiveSignatureListProps` and `EntityMemberSummary`

**Location:**

- `apps/docs/src/components/docs/entity/EntityHeader.tsx:167`
- `apps/docs/src/components/docs/entity/functions/FunctionSignaturesInline.tsx:15,16`
- `apps/docs/src/components/docs/entity/functions/FunctionSignaturesSection.tsx:14,15`
- `apps/docs/src/components/docs/entity/functions/FunctionBody.tsx:45,75,80`
  **Rule:** AGENTS.md "No `as unknown as T` double casts"
  **Problem:** `(s as unknown as ActiveSignatureListProps).anchor` is reading `anchor` off a `FunctionSignatureModel` that doesn't declare `anchor`. The casts hide a real model gap: signatures need an `anchor` field on the model, or `ActiveSignatureListProps['anchor']` should be inferred from a structural pick. The `EntityMemberSummary` casts in `FunctionBody` are even worse — they fabricate fake summaries.
  **Fix:** Add `anchor?: string` to `FunctionSignatureModel` in `lib/docs/types.ts` (already populated by `ensureSignatureAnchor` in `buildFunctionSignature` — just persist it onto the model). Replace the `as unknown as EntityMemberSummary` builders with a dedicated `FunctionParamMember` / `FunctionTypeParamMember` type that `MemberDetailGroup` accepts via a narrower prop type.
  **Auto-fixable:** no

### H4 — `as unknown as { __DOCS_UI__?: Snapshot }` on `window` in zustand store

**Location:** `apps/docs/src/store/ui.ts:38`
**Rule:** AGENTS.md "No `as unknown as T` double casts"
**Problem:** Augments `window` via a double cast instead of `declare global { interface Window { __DOCS_UI__?: Snapshot } }`.
**Fix:** Add a `declare global` block at the top of the file (or a `global.d.ts`) and reference `window.__DOCS_UI__` directly.
**Auto-fixable:** yes

### H5 — `DocsUIContext` snapshot is always `{}` — entire SSR-snapshot machinery is dead

**Location:** `apps/docs/src/app/docs/layout.tsx:65,72,74`; consumers `apps/docs/src/components/docs/entity/EntityMembersSection.tsx:34`, `apps/docs/src/components/docs/entity/member/MemberAccessControls.tsx:22,31,47`; store `apps/docs/src/store/ui.ts:34-48`
**Rule:** AGENTS.md "No dead code"; "Scope discipline"
**Problem:** `const snapshot = {};` is the literal `Snapshot`. The `<script dangerouslySetInnerHTML>` injects `window.__DOCS_UI__ = {}` and the store reads it back — but nothing ever populates it, so `ctx?.memberAccessLevel` in two components is always `undefined` and the layout's `DocsUIProvider` is a no-op. Either wire it up to read cookies/headers and seed `selectedPackage`/`selectedVersion`/`memberAccessLevel`, or delete the script tag, the `DocsUIContext`, the `readSnapshotFromWindow`, and the two `useContext(DocsUIContext)` calls.
**Fix:** Delete the dead machinery (recommended) or seed `snapshot` from cookies in the server layout.
**Auto-fixable:** no

### H6 — `dangerouslySetInnerHTML` populated from external typedoc summaries with no allowlist/sanitization

**Location:**

- `apps/docs/src/components/docs/entity/comments/CommentParagraphs.tsx:27`
- `apps/docs/src/components/docs/entity/utils/renderers/renderParagraphNode.tsx:6`
- `apps/docs/src/components/docs/entity/signatures/SignatureBlock.tsx:12`
- `apps/docs/src/components/docs/entity/signatures/SignaturePanel.tsx:27`
- `apps/docs/src/components/docs/entity/signatures/SignatureCard.tsx:26,48`
- `apps/docs/src/components/docs/entity/enums/EnumMemberCard.tsx:27`
- `apps/docs/src/components/docs/entity/comments/CommentExamples.tsx:63`
- `apps/docs/src/components/ui/CodeBlock.tsx:41`
- `apps/docs/src/components/ui/CodePanel.tsx:28`
- `apps/docs/src/components/docs/InstallCommandTabs.tsx:63`
  **Rule:** AGENTS.md repository policy on safety; review rule on `dangerouslySetInnerHTML`
  **Problem:** Comment HTML is built by `marked` + `shiki` over `DocComment.summary` and `@example` block tags coming from typedoc extraction. Today the source is trusted (the repo's own JSDoc), but if a third-party `@seedcord/*` package adds its own tsdoc and the docs pipeline ever inlines anything that came from a registry, this becomes XSS-by-default. The comment renderer at `apps/docs/src/lib/docs/comments/renderers/renderParagraphs.ts` runs `marked.parse(markdown, { async: true })` with no sanitizer hook.
  **Fix:** Pipe the final HTML through `DOMPurify` (or `marked`'s `sanitizer` option) before reaching JSX. Centralize in a `sanitizeHtml(html)` helper and apply it in `CommentParagraphs`, `renderParagraphNode`, `Signature*`, and `EnumMemberCard`. Code blocks coming from `highlightToHtml` are safe (`escapeHtmlAttr` handles attrs), but the assembled markdown output is not.
  **Auto-fixable:** no

### H7 — `inferToneFromSymbol` runs on every entity render and produces user-visible wrong tones

**Location:** `apps/docs/src/components/docs/entity/utils/useEntityTone.ts:9-34`
**Rule:** YAGNI / FAIL-FAST-RULES — don't guess
**Problem:** When `kind === 'class'` (the default `resolveEntityTone` fallback when input is unknown), the hook infers tone by regex on the symbol name. `(Hook|Schema|Result|Payload|Type)$` maps `LifecycleHook` to `'type'`, `EventResult` to `'type'`, etc. This silently mislabels real classes whose names happen to end in those tokens. Combined with `resolveEntityTone` already defaulting to `'class'` on unknown input, the inference is unreachable for any kind the engine emits correctly, and actively wrong when it does fire.
**Fix:** Delete `inferToneFromSymbol` and let `useEntityTone` return `resolveEntityTone(kind)` directly. If the engine ever fails to emit a `kind`, fail fast and surface the unknown kind.
**Auto-fixable:** no

### H8 — Search route `getResultKind` lowercases `kindName` but lookup table uses camelCase keys

**Location:** `apps/docs/src/app/docs/search/route.ts:39-62, 114-115`
**Rule:** Correctness; FAIL-FAST-RULES
**Problem:** `KIND_TO_RESULT` keys are `enumMember`, `typeAlias`, `typeParameter`, etc., but at line 114 `normalizedKind = kindName(candidate.kind).toLowerCase()` and then `ENTITY_RESULT_KINDS.has(normalizedKind as SearchResultKind)` checks against `'class' | 'interface' | 'enum' | 'type' | 'function' | 'variable'`. `kindName('enumMember')` returns `'enumMember'`, lowercased to `'enummember'`, which is not in the set. Result-kind detection silently fails for camel-cased kinds and falls back to `'page'`.
**Fix:** Stop lowercasing. Use the original `kindName` against a camel-case `Set`. Or normalize both sides through a single helper.
**Auto-fixable:** yes

### H9 — `dynamic = 'force-dynamic'` on the entity page disables static caching for every doc page

**Location:** `apps/docs/src/app/docs/packages/[packageId]/[versionId]/[[...entitySegments]]/page.tsx:13`
**Rule:** No premature pessimization; YAGNI
**Problem:** Doc pages are derived from the on-disk manifest at build time — they're inherently static. Forcing dynamic rendering throws away Next's RSC cache and forces a server roundtrip for every entity view. Either remove the directive (defaults to static when params resolve) or switch to `dynamic = 'force-static'` to match `apps/docs/src/app/docs/page.tsx:6`.
**Fix:** Remove the line, or set `force-static`. Add `generateStaticParams` if you want pre-rendering.
**Auto-fixable:** yes (remove line)

---

## MEDIUM Severity (fix in same pass)

### M1 — `forwardRef` in Button.tsx (React 19 no longer needs it)

**Location:** `apps/docs/src/components/ui/Button.tsx:4,33,48`
**Rule:** REACT19.md; AGENTS.md "React 19: ref is a normal prop, no forwardRef"
**Problem:** `Button` uses `forwardRef<HTMLButtonElement, ButtonProps>` and a `displayName`. React 19 treats `ref` as a regular prop on function components.
**Fix:** Drop `forwardRef`, add `ref?: Ref<HTMLButtonElement>` to `ButtonProps`, destructure `ref` from props, and delete `Button.displayName`.
**Auto-fixable:** yes

### M2 — `useContext(DocsUIContext)` instead of React 19 `use(DocsUIContext)`

**Location:** `apps/docs/src/components/docs/entity/EntityMembersSection.tsx:3,34`; `apps/docs/src/components/docs/entity/member/MemberAccessControls.tsx:3,22`
**Rule:** REACT19.md; AGENTS.md "React 19: use(Context) not useContext(Context)"
**Problem:** Both files use the legacy hook. (Note: if H5 lands, these calls disappear entirely.)
**Fix:** `import { use } from 'react'` and replace `useContext(DocsUIContext)` with `use(DocsUIContext)`.
**Auto-fixable:** yes

### M3 — `<h1 className="... font-bold ...">` on entity title and 404

**Location:** `apps/docs/src/components/docs/entity/EntityHeader.tsx:107`; `apps/docs/src/components/docs/NotFound.tsx:7`
**Rule:** AGENTS.md "`font-bold` on `<h1>`–`<h6>` → `font-semibold`"
**Problem:** Display-size headings using `font-bold` crush counter shapes.
**Fix:** Change `font-bold` to `font-semibold`. (Layout has `font-black` at `apps/docs/src/app/page.tsx:14` which is even heavier — same rule applies.)
**Auto-fixable:** yes

### M4 — `font-black` on landing `<h1>`

**Location:** `apps/docs/src/app/page.tsx:14`
**Rule:** AGENTS.md heading weight rule (TAILWIND.md)
**Problem:** `font-black` is the heaviest weight Tailwind ships; same readability concern as `font-bold`.
**Fix:** `font-semibold` (or at most `font-bold` if the mock demands display weight).
**Auto-fixable:** yes

### M5 — `bg-[var(--…)]` / `outline-[var(--…)]` instead of Tailwind v4 `outline-(--…)`

**Location:** `apps/docs/src/components/ui/Button.tsx:10`; `apps/docs/src/components/ui/CodeBlock.tsx:25`
**Rule:** AGENTS.md "Tailwind v4 syntax: `bg-(--token)` not `bg-[var(--token)]`"
**Problem:** Two leftover v3 syntaxes in shared primitives.
**Fix:** `focus-visible:outline-[var(--accent-a)]` → `focus-visible:outline-(--accent-a)`; `text-[var(--text)]` → `text-(--text)`.
**Auto-fixable:** yes

### M6 — `outline-none` instead of `outline-hidden`

**Location:** `apps/docs/src/components/layout/sidebar/SidebarSelect.tsx:51,79`; `apps/docs/src/components/docs/entity/member/MemberAccessControls.tsx:56`; `apps/docs/src/components/search/command-palette/CommandListItem.tsx:71`; `apps/docs/src/components/search/command-palette/CommandHeader.tsx:30`; `apps/docs/src/components/header/search-controls/DesktopSearchButton.tsx:24`
**Rule:** AGENTS.md "`outline-hidden` not `outline-none`"
**Problem:** Six files use the v3 `outline-none` (the v4 equivalent that preserves focus visibility for forced-colors is `outline-hidden`).
**Fix:** Replace each `outline-none` / `focus:outline-none` with `outline-hidden` / `focus:outline-hidden`.
**Auto-fixable:** yes

### M7 — `h-N w-N` pairs with equal axes (use `size-N`)

**Location:** `apps/docs/src/components/ui/Button.tsx:23` (`h-10 w-10`); `apps/docs/src/components/ui/CopyButton.tsx:52` (`h-9 w-9`); `apps/docs/src/components/ui/CopyAnchorButton.tsx:63` (`h-8 w-8`); `apps/docs/src/components/ui/ScrollToTopButton.tsx:70,77` (`h-12 w-12`, `h-5 w-5`); `apps/docs/src/components/layout/sidebar/SidebarSelect.tsx:60,82` (`h-4 w-4`); `apps/docs/src/components/layout/sidebar/SidebarItem.tsx:32` (`h-6 w-6`); `apps/docs/src/components/layout/sidebar/utils/container/MobileNavigationToggle.tsx:19`; `apps/docs/src/components/layout/sidebar/utils/container/MobilePanelDialog.tsx:35`; `apps/docs/src/components/docs/entity/EntityHeader.tsx:59`; `apps/docs/src/components/docs/entity/signatures/SignatureCard.tsx:19`; `apps/docs/src/components/docs/entity/member/MemberCardHeader.tsx:42,57`; `apps/docs/src/components/docs/entity/enums/EnumMemberCard.tsx:65,72`; `apps/docs/src/components/search/command-palette/CommandHeader.tsx:38`; `apps/docs/src/components/search/command-palette/CommandListItem.tsx:43`; `apps/docs/src/components/header/SeedcordMark.tsx:16`
**Rule:** AGENTS.md / TAILWIND.md — collapse to `size-N`
**Problem:** 17 occurrences across the app. This is a sweep, not a one-off.
**Fix:** Replace each `h-N w-N` (and `w-N h-N`) where N is equal with `size-N`.
**Auto-fixable:** yes (regex)

### M8 — `useContext` not `use` is itself another React 19 oversight in two files (see M2)

### M9 — `[class, class, class].join(' ')` for static class strings

**Location:** `apps/docs/src/lib/entityMetadata.ts:11-23, 30-46, …, 110-117` (every tone's `item`, `badge`, `tag` arrays); `apps/docs/src/components/search/command-palette/CommandListItem.tsx:30-40`
**Rule:** AGENTS.md "Use `cn(...)` (or string literals) for class composition"
**Problem:** Hand-rolled `[…].join(' ')` arrays bloat the source and dodge `tailwind-merge` ordering. They also make Tailwind's content-scanning regex matcher slightly less reliable for arbitrary values.
**Fix:** Replace with plain string literals or `tw\`…\``template tags (e.g.`'border-(--tone-class-badge-border) bg-(--tone-class-badge-bg) text-(--entity-class)'`). For`entityMetadata.ts`the whole`ENTITIES_INTERNAL` map is a candidate to be rebuilt from a config + a helper that emits the string.
**Auto-fixable:** partially

### M10 — `useState(propValue)` without sync in `InstallCommandTabs`

**Location:** `apps/docs/src/components/docs/InstallCommandTabs.tsx:22-23`
**Rule:** REACT19.md "`useState(propValue)` without sync"
**Problem:** `const initialId = commands[0]?.id; const [activeId, setActiveId] = useState(initialId);`. If `commands` ever changes externally (it's a `readonly` prop today), `activeId` will be stale. The downstream `useMemo` masks the bug because it falls back to `commands[0]`.
**Fix:** Either `key={initialId}` on the parent to remount when commands change, or add `useEffect(() => { if (!commands.some(c => c.id === activeId)) setActiveId(commands[0]?.id); }, [commands, activeId]);`.
**Auto-fixable:** no

### M11 — `forwardRef`-less but still inline `BASE_ICON_CLASSES`/inline class array passed to memoized children

**Location:** `apps/docs/src/components/search/command-palette/CommandListItem.tsx:55-62`
**Rule:** REACT19.md / general perf
**Problem:** `keywords = [action.path, action.id]` and a fresh `iconClasses` are computed inside the component body on every render and passed to `Command.Item` (cmdk memoizes downstream). Not catastrophic, but it defeats cmdk's row memo.
**Fix:** Wrap with `useMemo` or hoist the badge classes into a stable map.
**Auto-fixable:** no

### M12 — `setTimeout(…, 0)` "next-tick" hops in several effects

**Location:**

- `apps/docs/src/components/header/search-controls/ThemeToggle.tsx:17`
- `apps/docs/src/components/search/command-palette/useCommandPaletteSearch.ts:38`
- `apps/docs/src/components/search/command-palette/useCommandPaletteController.ts:86-87`
- `apps/docs/src/components/docs/entity/utils/useActiveSignature.tsx:17,39`
- `apps/docs/src/components/docs/entity/utils/useActiveSignatureList.tsx:29`
- `apps/docs/src/components/layout/sidebar/SidebarCategoryList.tsx:80-89`
- `apps/docs/src/components/layout/sidebar/utils/useSidebarSelectionState.tsx:79`
  **Rule:** AGENTS.md "Zero Technical Debt"; FAIL-FAST-RULES
  **Problem:** A `setTimeout(…, 0)` inside a `useEffect` is almost always papering over a render-order bug. Several of these (`ThemeToggle`, `useActiveSignature`, `useSidebarSelectionState`) just want "after commit" — that's what `useEffect` already gives you. Others (`useCommandPaletteController`) seem to be racing radix focus traps.
  **Fix:** Audit each one. Replace with `useEffect` body directly where possible; document with a `// justified: …` comment where a microtask hop is genuinely required (e.g., focus management after Radix portal mount).
  **Auto-fixable:** no

### M13 — `useSidebarScrollGuards` returns four `useCallback`s whose bodies are empty

**Location:** `apps/docs/src/components/layout/sidebar/utils/useSidebarScrollGuards.tsx:32-42`
**Rule:** AGENTS.md "No dead code"
**Problem:** `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` all have an "ignored" body and exist only because `Sidebar.tsx` wires them to `onTouchStart`, `onTouchMove`, `onTouchEnd`, `onTouchCancel`. Three empty handlers do nothing — remove both the handlers and the JSX listeners.
**Fix:** Delete the three empty callbacks and the four `onTouch*` props in `Sidebar.tsx:135-137`.
**Auto-fixable:** yes

### M14 — `FunctionSignaturesSection` is unused (dead export)

**Location:** `apps/docs/src/components/docs/entity/functions/FunctionSignaturesSection.tsx`
**Rule:** AGENTS.md "No dead code … unused exports"
**Problem:** Nothing imports it. `EntityHeader` and `FunctionBody` both use `FunctionSignaturesInline` or `SignatureCard` directly.
**Fix:** Delete the file.
**Auto-fixable:** yes

### M15 — `renderVariable` is unused (commented out at its only call site)

**Location:** `apps/docs/src/components/docs/entity/utils/renderers/renderVariable.tsx` + commented call in `renderEntityBody.tsx:8,22`
**Rule:** AGENTS.md "No dead code … no commented-out code"
**Problem:** `renderEntityBody` has the import and call commented out. Either restore variable rendering (the user-facing `variable` entity page currently renders nothing below the header) or delete the file and the comments.
**Fix:** Decide which way. If variables intentionally show only the header, delete `renderVariable.tsx` and the comments. Otherwise restore.
**Auto-fixable:** no (intent decision)

### M16 — `DEFAULT_PACKAGE` in `loadEntityModel` duplicates `DEFAULT_MANIFEST_PACKAGE`

**Location:** `apps/docs/src/lib/docs/loadEntityModel.ts:11`
**Rule:** AGENTS.md DRY
**Problem:** `export const DEFAULT_PACKAGE = 'seedcord';` is identical to `DEFAULT_MANIFEST_PACKAGE` in `apps/docs/src/lib/docs/packages.ts:52`. Two sources of truth for the same constant.
**Fix:** Import `DEFAULT_MANIFEST_PACKAGE` and remove the local export.
**Auto-fixable:** yes

### M17 — `key={i}` index-as-key in `SeeAlso`

**Location:** `apps/docs/src/components/docs/ui/SeeAlso.tsx:15`
**Rule:** AGENTS.md / REACT19.md "No array index as React key"
**Problem:** `entries.map((s, i) => <span key={i}>)` will reorder badly when the array is filtered. Use `s.name` (the entry name is unique within the array as built in `renderSeeAlso`).
**Fix:** `key={s.href ?? s.name}`.
**Auto-fixable:** yes

### M18 — `SignatureCard` renders an empty `<Button>` when `signature.sourceUrl` is set

**Location:** `apps/docs/src/components/docs/entity/signatures/SignatureCard.tsx:14-22`
**Rule:** Correctness
**Problem:** The button body is empty (`<Button …></Button>`) — there's no icon or label inside. Either the lucide icon was lost in a refactor or the whole branch is unreachable.
**Fix:** Restore the icon (probably `<Icon icon={ArrowUpRight} size={18} />`) and an `<a href={signature.sourceUrl}>` wrapper, mirroring `EntityHeader.SourceButton`.
**Auto-fixable:** no

### M19 — `Icon` types accept a `ComponentType<Record<string, unknown>>` and then re-narrow internally

**Location:** `apps/docs/src/components/ui/Icon.tsx:7-17`
**Rule:** TYPESCRIPT.md
**Problem:** `IconComponentType = React.ComponentType<Record<string, unknown>>` accepts anything that looks like a React component, but the file then re-aliases it (`const IconComponent: IconComponentType = iconComponent;`) which is pointless. The real type should be `LucideIcon` (or a union including the local `GithubIcon` props).
**Fix:** `import type { LucideIcon } from 'lucide-react'` and union with the local `GithubIcon` signature (or extract a shared `IconLike = LucideIcon | typeof GithubIcon`). Drop the re-alias line.
**Auto-fixable:** no

### M20 — `Icon` accepts unknown `[key: string]: unknown` in `GithubIcon`

**Location:** `apps/docs/src/components/ui/GithubIcon.tsx:9`
**Rule:** TYPESCRIPT.md — avoid index signature as a way to accept any prop
**Problem:** `interface Props { …; [key: string]: unknown }` is a polite way of writing `any`. Constrain to the SVG props that actually matter (`React.SVGAttributes<SVGSVGElement>`).
**Fix:** `interface Props extends Omit<React.SVGAttributes<SVGSVGElement>, 'children'> { size?: number; title?: string; }`.
**Auto-fixable:** no

### M21 — `cloneElement<SidebarComponentProps>` with manual prop merging in `Container.tsx`

**Location:** `apps/docs/src/components/layout/sidebar/utils/container/Container.tsx:25-46`
**Rule:** REACT19.md — cloneElement is discouraged; prefer composition with a render-prop or two children
**Problem:** The container calls `cloneElement` on a passed-in `sidebar` ReactNode to inject `variant`, `className`, and `onSelect`. This is fragile: if the caller wraps `<Sidebar>` in a `<Suspense>` or a fragment, `isValidElement` fails and both variants render the same. The layout already controls the call site — just pass props directly.
**Fix:** Change `Container`'s API to `sidebar: (variant: SidebarVariant) => ReactNode` (render prop), or move the desktop/mobile Sidebar instantiation into `Container` and accept just the data props.
**Auto-fixable:** no

### M22 — Sidebar.tsx is ~150 lines doing 6 responsibilities (selection state, persistence, scroll guards, navigation, package/version mutation, render)

**Location:** `apps/docs/src/components/layout/sidebar/Sidebar.tsx`
**Rule:** AGENTS.md "Split large files"
**Problem:** Not over 200 lines, but borderline. The two `try { setSelectedPackage } catch { /* ignore */ }` blocks (lines 72-79 and 91-95) swallow errors silently — zustand setters never throw, so the catches are also dead.
**Fix:** Remove both `try/catch`. Consider extracting `onPackageChange`/`onVersionChange` into the existing `useSidebarNavigationHandlers` hook (the hook is misleadingly named — it does navigation only, not state).
**Auto-fixable:** partially

### M23 — `ENTITIES` re-exports `ENTITIES_INTERNAL` as a typed alias (dead re-export)

**Location:** `apps/docs/src/lib/entityMetadata.ts:124`
**Rule:** AGENTS.md "Dead exports"
**Problem:** `export const ENTITIES: typeof ENTITIES_INTERNAL = ENTITIES_INTERNAL;` — `ENTITIES` is referenced only inside the same file (the `isEntityTone` guard). Drop the export and rename `ENTITIES_INTERNAL` to `ENTITIES`.
**Fix:** Inline.
**Auto-fixable:** yes

### M24 — Three single-character constants for string lengths

**Location:** `apps/docs/src/lib/entityMetadata.ts:152-154`
**Rule:** AGENTS.md "Don't add features … not in the task description"; readability
**Problem:** `const SINGLE_CHARACTER = 1; const DOUBLE_CHARACTER = 2; const TRIPLE_CHARACTER = 3;` — naming a literal `1` does not help comprehension. Inline.
**Fix:** Replace `value.length - SINGLE_CHARACTER` with `value.length - 1`.
**Auto-fixable:** yes

### M25 — `getResultKind` in `route.ts` builds the same data twice (also see H8)

**Location:** `apps/docs/src/app/docs/search/route.ts:39-62, 88-94`
**Rule:** DRY
**Problem:** `MEMBER_ANCHOR_PREFIX` and `getParentSlug` in the route are duplicated from `apps/docs/src/lib/docs/resolveReferenceHref.ts:15-27` (and `findEntityNode` in lines 29-42 of that file). The route reimplements the resolver instead of calling it.
**Fix:** Use `resolveReferenceHref` (or factor the shared logic into `lib/docs/`) so the rule for member anchor prefixes lives in one place.
**Auto-fixable:** no

### M26 — `Object.keys(window.localStorage)` runs synchronously on every click

**Location:** `apps/docs/src/lib/settings/clearHistory.ts:6-9`
**Rule:** Correctness — minor
**Problem:** `Object.keys(window.localStorage)` enumerates _all_ keys including those from third-party scripts. The `.startsWith('docs.')` filter is OK, but the cookie-clearing block deletes every cookie under `/` regardless of name pattern (it doesn't filter to `docs.*`). That nukes `theme` (next-themes' cookie) and `next-auth` style cookies on the page, which is surprising for a "Clear docs history" action.
**Fix:** Either rename the action to "Clear all site data", or filter cookies to a docs-specific prefix the same way as localStorage.
**Auto-fixable:** no (UX choice)

### M27 — `formatVersionLabel` uses NBSP replacement on a literal that has no NBSP

**Location:** `apps/docs/src/lib/docs/version.ts:3`
**Rule:** YAGNI / dead code
**Problem:** `\`latest · ${v}\`.replace(' ', ' ');`— the template literal contains only normal spaces. The replacement is a no-op.
**Fix:** Drop the`.replace(...)` call.
**Auto-fixable:** yes

### M28 — `Boolean(...)` double-wrap in `SignaturePanel`

**Location:** `apps/docs/src/components/docs/entity/signatures/SignaturePanel.tsx:53-57`
**Rule:** TYPESCRIPT.md — readability
**Problem:** `Boolean(isActive) && Boolean(signature.deprecationStatus?.isDeprecated) && !Boolean(parentDeprecationStatus?.isDeprecated)` — three `Boolean(...)` wraps on values that are already boolean / optional. The `!Boolean(x)` form is just `!x`.
**Fix:** `isActive && signature.deprecationStatus?.isDeprecated && !parentDeprecationStatus?.isDeprecated && parentKey !== sigKey`.
**Auto-fixable:** yes

### M29 — `Function` type kind list duplicated as `Set<string>` and as `Record<...>` (search route)

**Location:** `apps/docs/src/app/docs/search/route.ts:86, 88-94`
**Rule:** DRY
**Problem:** `ENTITY_RESULT_KINDS = new Set(['class', ...])` is also encoded in `KIND_TO_RESULT`. Derive one from the other.
**Fix:** `const ENTITY_RESULT_KINDS = new Set([...KIND_TO_RESULT.values()].filter(isEntityKind));` or invert the lookup table.
**Auto-fixable:** no

### M30 — `cn('static order-last opacity-100', …)` ships the `static` Tailwind class which collides with `position: static`

**Location:** `apps/docs/src/components/docs/entity/member/MemberCardHeader.tsx:43`
**Rule:** Correctness
**Problem:** `'static order-last opacity-100'` — the `static` token is the Tailwind position utility and is intentional, but reading the line it's easy to mistake for a TypeScript keyword. Add a leading comment or rename to make intent explicit. Not a bug, but worth flagging during the same sweep.
**Fix:** Either add `// position: static` comment above the `cn` call or move position resets into a documented utility.
**Auto-fixable:** no

### M31 — `useSidebarSelection` returns `packageOptions: catalog` which is a different identity each render

**Location:** `apps/docs/src/components/layout/sidebar/utils/useSidebarSelection.tsx:39-41`
**Rule:** REACT19.md — referential stability
**Problem:** `packageOptions: catalog` aliases the prop, but the hook's caller passes it through to `SidebarHeader`/`SidebarSelect` which `.map()` over it inside their own bodies — fine on its own, but means the hook is effectively a no-op for `packageOptions` and `versionOptions` (the latter could change identity each render even when contents are the same).
**Fix:** Either drop `packageOptions` from the hook return (let the caller use `catalog` directly) or memoize `versionOptions` properly.
**Auto-fixable:** yes (drop redundant returns)

### M32 — Commented note `// access label formatting is now shown in signatures; import removed`

**Location:** `apps/docs/src/components/docs/entity/member/MemberCardHeader.tsx:4`
**Rule:** AGENTS.md "No commented-out code" / CODE-COMMENTING-GUIDELINES.md
**Problem:** Tombstone comment. Either restate the architectural decision in a TSDoc on the component, or drop the comment.
**Fix:** Delete.
**Auto-fixable:** yes

---

## LOW Severity (nice-to-have)

### L1 — `eslint-disable-next-line complexity` used to silence a complex function

**Location:** `apps/docs/src/components/docs/entity/EntityHeader.tsx:146`; `apps/docs/src/lib/docs/comments/renderers/renderSeeAlso.ts:76`
**Rule:** AGENTS.md "Never file-wide or project-wide" + general principle
**Problem:** Inline disables for `complexity` indicate the function should be split. `EntityHeader` is 80 lines with 8 conditional render branches; `collectSeeAlsoFromBlockTags` is 40 lines with five nested branches.
**Fix:** Extract sub-components or sub-functions instead of disabling the rule.
**Auto-fixable:** no

### L2 — `// TODO: Refactor and use the correct tailwind layer and the @apply things`

**Location:** `apps/docs/src/styles/utilities.css:69`
**Rule:** AGENTS.md "No `// TODO: complete later`"
**Problem:** Explicit deferred-work comment.
**Fix:** Either complete the refactor or drop the comment and capture the task in TASKS.md.
**Auto-fixable:** no

### L3 — `code-scroll-content` and `code-scroll-area` defined in `utilities.css` but the rules are mostly `display: …` / `min-width: …` that could be Tailwind classes

**Location:** `apps/docs/src/styles/utilities.css:83-117`
**Rule:** TAILWIND.md
**Problem:** Roughly half of these utility classes encode trivial layout that Tailwind already exposes (`block w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden`). Worth a follow-up to move what's expressible inline.
**Fix:** Convert and inline; keep only the `.shiki *` overrides in CSS.
**Auto-fixable:** no

### L4 — `bg-surface-98/97/96/95/94` all alias to two tokens

**Location:** `apps/docs/src/styles/utilities.css:24-43`
**Rule:** AGENTS.md "YAGNI" / DRY
**Problem:** Five different class names all apply one of two CSS variables. They look like a tone scale but aren't — `98` and `97` both map to `--surface-faint`, etc.
**Fix:** Pick the two real values, name them descriptively (`bg-surface-faint`, `bg-surface-subtle`), and drop the misleading 98/97/96/95/94 split.
**Auto-fixable:** no

### L5 — `console.info`-only logger; production logs are noisy

**Location:** `apps/docs/src/lib/logger.ts`
**Rule:** AGENTS.md "No premature optimization" + production-readiness
**Problem:** Every interaction logs (search-button click, sidebar item activate, theme toggle). The file disables `no-console` and ships to the browser. Acceptable in dev; bad in production. No environment gate.
**Fix:** Gate behind `process.env.NODE_ENV !== 'production'` or a `?debug` URL flag.
**Auto-fixable:** yes

### L6 — `String(node.slug)` defensive coerce — `slug` is already typed as `string`

**Location:** `apps/docs/src/lib/docs/resolveReferenceHref.ts:23,32,59,125`
**Rule:** TYPESCRIPT.md — don't cast values already correctly typed
**Problem:** `slug` is `string` in `DocNode`. Wrapping in `String(...)` is noise.
**Fix:** Remove `String(...)` calls.
**Auto-fixable:** yes

### L7 — `tryFormat` swallows prettier errors and reformats by wrapping in `class _ { … }`

**Location:** `apps/docs/src/lib/docs/formatting.ts:12-46`
**Rule:** FAIL-FAST-RULES — don't paper over errors
**Problem:** The fallback "wrap in a class" is clever but undocumented and silent. If both attempts fail, the raw header text is returned with no log line.
**Fix:** At minimum, log via `log(...)` on fallback so debugging is possible. Long-term: have the docs-engine emit formatted text and skip the prettier dance here.
**Auto-fixable:** no

### L8 — Hardcoded color hexes (`#cf3234`, `#070917`, `#f8f6e8`, etc.) in tokens.css are fine, but the deprecated-dark token in globals.css duplicates a constant that lives nowhere else

**Location:** `apps/docs/src/app/globals.css:11,22`
**Rule:** DRY
**Problem:** `--deprecated-dark: #cf3234;` is identical in both `:root` and `[data-theme='dark']`. Define once outside the selector.
**Fix:** Move to `tokens.css`.
**Auto-fixable:** yes

### L9 — `getToneConfig(tone).styles` accessed inline many times instead of through one destructure

**Location:** `apps/docs/src/components/docs/entity/EntityHeader.tsx:163-165`; `apps/docs/src/components/layout/sidebar/SidebarCategoryList.tsx:32-34`
**Rule:** Readability
**Problem:** Pattern is fine; calling it out only because it's repeated and could go behind a small helper that returns `{ Icon, styles, label }`.
**Fix:** Add `getTonePresentation(tone)` returning the bundle.
**Auto-fixable:** no

### L10 — `CommandListContent` builds a `listProps` object then conditionally appends `errorMessage`

**Location:** `apps/docs/src/components/search/command-palette/CommandPaletteDialog.tsx:91-100`
**Rule:** TYPESCRIPT.md — `exactOptionalPropertyTypes`-friendly pattern
**Problem:** `listProps.errorMessage = resolvedError;` mutation after object literal creation. Prefer a single object literal with conditional spread.
**Fix:** `const listProps: CommandListContentProps = { showInitialHint, isSearching, results: searchState.results, onSelect: handleSelect, ...(resolvedError ? { errorMessage: resolvedError } : {}) };`
**Auto-fixable:** yes

### L11 — `Pill` accepts only `className` + `children` but lives in `components/docs/ui` rather than `components/ui`

**Location:** `apps/docs/src/components/docs/ui/Pill.tsx`
**Rule:** AGENTS.md "UI Primitives" — primitives live in `components/ui/`
**Problem:** `Pill` is generic — used by entity badges, package badges, version chips. Belongs in `components/ui/Pill.tsx` next to `Button` and `Icon`.
**Fix:** `git mv` to `components/ui/Pill.tsx` and update imports.
**Auto-fixable:** yes

### L12 — `code-scroll-area panel px-3 py-2 text-sm text-(--text) sm:px-4 sm:py-3` and `code-scroll-area panel px-2.5 py-2 text-(--text) md:px-3 md:py-2.5` are near-duplicate

**Location:** `apps/docs/src/components/ui/CodePanel.tsx:13`; `apps/docs/src/components/docs/entity/signatures/SignaturePanel.tsx:11`; `apps/docs/src/components/docs/entity/signatures/SignatureBlock.tsx:7`
**Rule:** DRY
**Problem:** Three nearly-identical scroll wrapper class strings.
**Fix:** Lift into a `tw` constant in `lib/utils` or expose a `<CodeViewport variant="panel"|"card"|"compact">` primitive.
**Auto-fixable:** no

### L13 — TSDoc missing on every exported API in `lib/docs/`

**Location:** `apps/docs/src/lib/docs/**` (every `export function …`)
**Rule:** CODE-COMMENTING-GUIDELINES.md
**Problem:** No JSDoc on `buildEntityHref`, `resolveReferenceHref`, `loadEntityModel`, `formatDeclarationHeader`, etc. Low priority because these are app-internal, but they're the surface the user is about to refactor.
**Fix:** Add TSDoc to the functions targeted for the engine move (see cleanup section).
**Auto-fixable:** no

---

## Test Coverage Gaps

`apps/docs` has no `tests/` directory and no Vitest config. Every module listed below is currently uncovered.

### Missing unit tests

- `apps/docs/src/lib/docs/routes.ts` — `buildEntityHref`, `parseEntityPathSegments`, `buildPackageBasePath` are pure URL builders with several branches (tone present/absent, version fallback to `latest`, segment encoding). Most critical to test before extracting into the engine.
- `apps/docs/src/lib/docs/packages.ts` — `resolveManifestPackageName`, `sanitizeExternalKey`, `computePackageAliases` (alias resolution, scoped/unscoped fallback). Edge cases: empty string, `'@scoped/name<T>'` generic stripping.
- `apps/docs/src/lib/docs/resolveReferenceHref.ts` — biggest correctness risk in the app. Test internal vs. external, parameter anchor, owner-node fallback, external package URL fallback, qualifiedName fallback.
- `apps/docs/src/lib/docs/catalog.ts` — `parseSemver`/`compareSemver` need tests (currently zero-pad on non-numeric, which is fine but unverified) and `findCatalogVersion`'s `latest` resolution.
- `apps/docs/src/lib/docs/comments/cleaners.ts` — `escapeHtml`/`escapeAttribute`/`sanitizeInternalHref`. These are security-adjacent; test that `INTERNAL_DOC_PATH` rejects `https://evil/docs/`.
- `apps/docs/src/lib/docs/comments/renderers/renderSeeAlso.ts` — splitting on `•`/em-dash/comma is complex; test with realistic typedoc input.
- `apps/docs/src/lib/docs/builders/utils.ts` — `headerHasPrefix`, `selectDescription`, `stripDuplicateDescription`, `buildDeprecationStatusFromNodeLike`.
- `apps/docs/src/lib/docs/formatting.ts` — `tryFormat` fallback paths; `formatDeclarationHeader` with heritage clauses.
- `apps/docs/src/lib/entityMetadata.ts` — `resolveEntityTone` synonym handling (`typealias`, `alias`, plural `enums` → `enum`).
- `apps/docs/src/lib/memberAccess.ts` — trivial but the access ranking flows into `shouldIncludeMember` gating.
- `apps/docs/src/lib/shiki.ts` — `preprocessMarkdownLinks` / `applyLinkMarkers` regex pipeline; sentinel collisions.
- `apps/docs/src/lib/utils.ts` — `tw` (see H1; tests would have caught the bug).

### Missing component tests

- `apps/docs/src/components/docs/entity/EntityHeader.tsx` — complex deprecation-decoration branching (lines 202-214).
- `apps/docs/src/components/docs/entity/member/MemberCard.tsx` — composed deprecation status fallback to parent.
- `apps/docs/src/components/docs/entity/signatures/SignaturePanel.tsx` — `shouldDecorate` logic (H1 candidate; covered above as M28).
- `apps/docs/src/components/layout/sidebar/utils/useSidebarSelectionState.tsx` — path-derived selection vs. pending vs. props.
- `apps/docs/src/components/search/command-palette/useCommandPaletteSearch.ts` — debounce + abort behaviour.
- `apps/docs/src/store/ui.ts` — snapshot read + localStorage write.

---

## lib/docs/ Cleanup Candidates (TASKS.md item 11)

### Should move to `@seedcord/docs-engine`

- `apps/docs/src/lib/docs/routes.ts` — `buildEntityHref`, `buildPackageBasePath`, `parseEntityPathSegments`, `getEntityRouteSegment`, `DEFAULT_VERSION_SEGMENT` are engine-layer URL construction concerns. They depend only on `EntityTone`/`toneToDirectory` (also engine candidates — see `entityMetadata.ts`) and the manifest package name. Suggested target: `packages/docs-engine/src/routing/url-builder.ts`.
- `apps/docs/src/lib/docs/resolveReferenceHref.ts` — reference-to-URL resolution is engine business. Today it imports `buildEntityHref` (local) + `resolveExternalPackageUrl` (also app-layer). Once routes move, this whole module follows. Suggested target: `packages/docs-engine/src/routing/reference-resolver.ts`.
- `apps/docs/src/lib/docs/packages.ts` — `sanitizeExternalKey`, `resolveExternalPackageUrl`, `resolveManifestPackageName`, `formatDisplayPackageName`, `computePackageAliases`, `sortPackages` all describe engine-side package identity. The `PACKAGE_OVERRIDES` map is the only app-flavoured piece (display name overrides) and could be an engine option. Suggested target: `packages/docs-engine/src/packages/identity.ts` with `apps/docs` supplying the override map via `DocsEngine.create({ packageOverrides })`.
- `apps/docs/src/lib/docs/rawExternalLinks.ts` — engine-relevant lookup; same package as above. Suggested target: `packages/docs-engine/src/packages/external-links.ts`.
- `apps/docs/src/lib/docs/version.ts` — `formatVersionLabel` is a UI presentation helper _today_ but trivial enough that it can live next to the engine's manifest reader so other apps share it.
- `apps/docs/src/lib/docs/builders/**` — every builder (`buildEntityModel`, `buildClassLikeEntity`, `buildEnumEntity`, `buildEnumMember`, `buildFunctionEntity`, `buildFunctionParameters`, `buildFunctionSignature`, `buildFunctionTypeParams`, `buildMemberSummary`, `buildSignatureDetails`, `buildTypeEntity`, `buildTypeParameterSummaries`, `buildVariableEntity`, `baseEntityModel.ts`, `resolveEntityKind.ts`, `utils.ts`) constructs the _engine-level_ model (`EntityModel`, `ClassLikeEntityModel`, etc.) from `DocNode`. That is the engine's job, not the app's. The only reason these live in `apps/docs` is that they reference `EntityTone` (from app-layer `entityMetadata.ts`) — fix by moving the tone vocabulary into the engine. Suggested target: `packages/docs-engine/src/models/builders/*` and `packages/docs-engine/src/models/types.ts`.
- `apps/docs/src/lib/docs/comments/cleaners.ts`, `comments/constants.ts`, `comments/creators.ts`, `comments/formatter.ts`, `comments/resolvers.ts`, `comments/renderers/*` — comment rendering (markdown + shiki + see-also + throws) is engine-layer once `marked`/`shiki` are abstracted. The renderer functions are pure and depend only on engine types + the `highlightToHtml` helper. Move to `packages/docs-engine/src/comments/`. `shiki.ts` itself stays in the app (Next-specific) but expose an `engine.formatComment(comment, { highlightCode })` API so the engine doesn't ship shiki.
- `apps/docs/src/lib/entityMetadata.ts` — the _tone vocabulary_ (`EntityTone`, `TONE_DIRECTORY_MAP`, `resolveEntityTone`, `getToneConfig`-minus-icons, `formatEntityKindLabel`) is engine-layer. The lucide `icon` + Tailwind class strings are UI. Split: move tone identity to `packages/docs-engine/src/tones.ts`, keep icon/styles map in `apps/docs/src/lib/tonePresentation.ts`.
- `apps/docs/src/lib/docs/loadEntityModel.ts` — entity lookup orchestration. The `findEntityNode` / `pickPreferredNode` logic is engine-level node resolution; the only app-flavoured piece is the `EntityQueryParams` query-string shape, which can be the app's adapter on top of an engine `engine.lookupEntity({ slug, qualifiedName, symbol, kind })` method. Move the core to `packages/docs-engine/src/lookup/find-entity.ts`.

### Should stay in apps/docs (UI-layer)

- `apps/docs/src/lib/docs/engine.ts` — `cache(async () => DocsEngine.create({ generatedRoot: GENERATED_ROOT }))` is Next-`cache`-specific. Stays.
- `apps/docs/src/lib/docs/catalog.ts` — composes engine output into the catalog shape consumed by `Sidebar`/`SidebarHeader`. UI navigation model; stays.
- `apps/docs/src/lib/docs/types.ts` — only the \_UI_ib/docs/`

**Location:** `apps/docs/src/lib/docs/**` (every `export function …`)
**Rule:** CODE-COMMENTING-GUIDELINES.md
**Problem:** No JSDoc on `buildEntityHref`, `resolveReferenceHref`, `loadEntityModel`, `formatDeclarationHeader`, etc. Low priority because these are app-internal, but they're the surface the user is about to refactor.
**Fix:** Add TSDoc to the functions targeted for the engine move (see cleanup section).
**Auto-fixable:** no

---

## Test Coverage Gaps

`apps/docs` has no `tests/` directory and no Vitest config. Every module listed below is currently uncovered.

### Missing unit tests

- `apps/docs/src/lib/docs/routes.ts` — `buildEntityHref`, `parseEntityPathSegments`, `buildPackageBasePath` are pure URL builders with several branches (tone present/absent, version fallback to `latest`, segment encoding). Most critical to test before extracting into the engine.
- `apps/docs/src/lib/docs/packages.ts` — `resolveManifestPackageName`, `sanitizeExternalKey`, `computePackageAliases` (alias resolution, scoped/unscoped fallback). Edge cases: empty string, `'@scoped/name<T>'` generic stripping.
- `apps/docs/src/lib/docs/resolveReferenceHref.ts` — biggest correctness risk in the app. Test internal vs. external, parameter anchor, owner-node fallback, external package URL fallback, qualifiedName fallback.
- `apps/docs/src/lib/docs/catalog.ts` — `parseSemver`/`compareSemver` need tests (currently zero-pad on non-numeric, which is fine but unverified) and `findCatalogVersion`'s `latest` resolution.
- `apps/docs/src/lib/docs/comments/cleaners.ts` — `escapeHtml`/`escapeAttribute`/`sanitizeInternalHref`. These are security-adjacent; test that `INTERNAL_DOC_PATH` rejects `https://evil/docs/`.
- `apps/docs/src/lib/docs/comments/renderers/renderSeeAlso.ts` — splitting on `•`/em-dash/comma is complex; test with realistic typedoc input.
- `apps/docs/src/lib/docs/builders/utils.ts` — `headerHasPrefix`, `selectDescription`, `stripDuplicateDescription`, `buildDeprecationStatusFromNodeLike`.
- `apps/docs/src/lib/docs/formatting.ts` — `tryFormat` fallback paths; `formatDeclarationHeader` with heritage clauses.
- `apps/docs/src/lib/entityMetadata.ts` — `resolveEntityTone` synonym handling (`typealias`, `alias`, plural `enums` → `enum`).
- `apps/docs/src/lib/memberAccess.ts` — trivial but the access ranking flows into `shouldIncludeMember` gating.
- `apps/docs/src/lib/shiki.ts` — `preprocessMarkdownLinks` / `applyLinkMarkers` regex pipeline; sentinel collisions.
- `apps/docs/src/lib/utils.ts` — `tw` (see H1; tests would have caught the bug).

### Missing component tests

- `apps/docs/src/components/docs/entity/EntityHeader.tsx` — complex deprecation-decoration branching (lines 202-214).
- `apps/docs/src/components/docs/entity/member/MemberCard.tsx` — composed deprecation status fallback to parent.
- `apps/docs/src/components/docs/entity/signatures/SignaturePanel.tsx` — `shouldDecorate` logic (H1 candidate; covered above as M28).
- `apps/docs/src/components/layout/sidebar/utils/useSidebarSelectionState.tsx` — path-derived selection vs. pending vs. props.
- `apps/docs/src/components/search/command-palette/useCommandPaletteSearch.ts` — debounce + abort behaviour.
- `apps/docs/src/store/ui.ts` — snapshot read + localStorage write.

---

## lib/docs/ Cleanup Candidates (TASKS.md item 11)

### Should move to `@seedcord/docs-engine`

- `apps/docs/src/lib/docs/routes.ts` — `buildEntityHref`, `buildPackageBasePath`, `parseEntityPathSegments`, `getEntityRouteSegment`, `DEFAULT_VERSION_SEGMENT` are engine-layer URL construction concerns. They depend only on `EntityTone`/`toneToDirectory` (also engine candidates — see `entityMetadata.ts`) and the manifest package name. Suggested target: `packages/docs-engine/src/routing/url-builder.ts`.
- `apps/docs/src/lib/docs/resolveReferenceHref.ts` — reference-to-URL resolution is engine business. Today it imports `buildEntityHref` (local) + `resolveExternalPackageUrl` (also app-layer). Once routes move, this whole module follows. Suggested target: `packages/docs-engine/src/routing/reference-resolver.ts`.
- `apps/docs/src/lib/docs/packages.ts` — `sanitizeExternalKey`, `resolveExternalPackageUrl`, `resolveManifestPackageName`, `formatDisplayPackageName`, `computePackageAliases`, `sortPackages` all describe engine-side package identity. The `PACKAGE_OVERRIDES` map is the only app-flavoured piece (display name overrides) and could be an engine option. Suggested target: `packages/docs-engine/src/packages/identity.ts` with `apps/docs` supplying the override map via `DocsEngine.create({ packageOverrides })`.
- `apps/docs/src/lib/docs/rawExternalLinks.ts` — engine-relevant lookup; same package as above. Suggested target: `packages/docs-engine/src/packages/external-links.ts`.
- `apps/docs/src/lib/docs/version.ts` — `formatVersionLabel` is a UI presentation helper _today_ but trivial enough that it can live next to the engine's manifest reader so other apps share it.
- `apps/docs/src/lib/docs/builders/**` — every builder (`buildEntityModel`, `buildClassLikeEntity`, `buildEnumEntity`, `buildEnumMember`, `buildFunctionEntity`, `buildFunctionParameters`, `buildFunctionSignature`, `buildFunctionTypeParams`, `buildMemberSummary`, `buildSignatureDetails`, `buildTypeEntity`, `buildTypeParameterSummaries`, `buildVariableEntity`, `baseEntityModel.ts`, `resolveEntityKind.ts`, `utils.ts`) constructs the _engine-level_ model (`EntityModel`, `ClassLikeEntityModel`, etc.) from `DocNode`. That is the engine's job, not the app's. The only reason these live in `apps/docs` is that they reference `EntityTone` (from app-layer `entityMetadata.ts`) — fix by moving the tone vocabulary into the engine. Suggested target: `packages/docs-engine/src/models/builders/*` and `packages/docs-engine/src/models/types.ts`.
- `apps/docs/src/lib/docs/comments/cleaners.ts`, `comments/constants.ts`, `comments/creators.ts`, `comments/formatter.ts`, `comments/resolvers.ts`, `comments/renderers/*` — comment rendering (markdown + shiki + see-also + throws) is engine-layer once `marked`/`shiki` are abstracted. The renderer functions are pure and depend only on engine types + the `highlightToHtml` helper. Move to `packages/docs-engine/src/comments/`. `shiki.ts` itself stays in the app (Next-specific) but expose an `engine.formatComment(comment, { highlightCode })` API so the engine doesn't ship shiki.
- `apps/docs/src/lib/entityMetadata.ts` — the _tone vocabulary_ (`EntityTone`, `TONE_DIRECTORY_MAP`, `resolveEntityTone`, `getToneConfig`-minus-icons, `formatEntityKindLabel`) is engine-layer. The lucide `icon` + Tailwind class strings are UI. Split: move tone identity to `packages/docs-engine/src/tones.ts`, keep icon/styles map in `apps/docs/src/lib/tonePresentation.ts`.
- `apps/docs/src/lib/docs/loadEntityModel.ts` — entity lookup orchestration. The `findEntityNode` / `pickPreferredNode` logic is engine-level node resolution; the only app-flavoured piece is the `EntityQueryParams` query-string shape, which can be the app's adapter on top of an engine `engine.lookupEntity({ slug, qualifiedName, symbol, kind })` method. Move the core to `packages/docs-engine/src/lookup/find-entity.ts`.

### Should stay in apps/docs (UI-layer)

- `apps/docs/src/lib/docs/engine.ts` — `cache(async () => DocsEngine.create({ generatedRoot: GENERATED_ROOT }))` is Next-`cache`-specific. Stays.
- `apps/docs/src/lib/docs/catalog.ts` — composes engine output into the catalog shape consumed by `Sidebar`/`SidebarHeader`. UI navigation model; stays.
- `apps/docs/src/lib/docs/types.ts` — only the _UI_-flavoured pieces (`NavigationEntityItem`, `NavigationCategory`, `PackageCatalogEntry`, `DocsCatalog`, `EntityQueryParams`, `BuildEntityHrefOptions`) should remain after the engine takes back its model. Most of the file currently is engine-layer (everything from `BaseEntityModel` downward).
- `apps/docs/src/lib/shiki.ts` — Next/shiki integration; stays.
- `apps/docs/src/lib/utils.ts` — `cn`/`tw` are Tailwind-specific app helpers; stay.
- `apps/docs/src/lib/memberAccess.ts` — `'public'|'protected'` filter is UI-only.
- `apps/docs/src/lib/hotkeys.ts`, `apps/docs/src/lib/logger.ts`, `apps/docs/src/lib/settings/clearHistory.ts` — UI/browser concerns.

### Duplicated logic with engine

- `apps/docs/src/lib/docs/resolveReferenceHref.ts:23-43` (`getParentSlug`, `findEntityNode`) overlaps almost exactly with `apps/docs/src/app/docs/search/route.ts:96-121`. Canonical version should live in the engine; both sites should import it.
- `apps/docs/src/lib/docs/resolveReferenceHref.ts:15-21` (`MEMBER_ANCHOR_PREFIX` for member anchors) is duplicated as `MEMBER_ANCHOR_PREFIX` in `apps/docs/src/app/docs/search/route.ts:88-94` and again in `apps/docs/src/components/search/command-palette/useCommandPaletteController.ts:16-23`. Three copies of the same anchor convention. Move into the engine alongside the route builder.
- `apps/docs/src/lib/docs/loadEntityModel.ts:50-56` (`findNodeBySlug` chains `getNodeByGlobalSlug` then `getNodeBySlug`) is also done inline in `route.ts:200-202`, `resolveReferenceHref.ts:35-36`, `resolveReferenceHref.ts:46`, and `comments/resolvers.ts:88-89`. Five call sites; fold into the engine as `engine.findNode(packageName, slug)`.
- `apps/docs/src/lib/docs/builders/buildClassLikeEntity.ts:7-9` and `apps/docs/src/lib/docs/builders/buildEnumEntity.ts:6` hardcode `kindLabel` strings (`'kind_property'`, `'kind_method'`, `'kind_constructor'`, `'kind_enum_member'`) that should be the engine's exported constants from `packages/docs-engine/src/kinds.ts`. They already exist as `kindName(...)` keys but the builders bypass the helper. Use `kindKey`/`kindLabel` exports instead.

---

## Summary

- HIGH: 9
- MEDIUM: 32
- LOW: 13
- Test gaps: 18 modules
- Cleanup candidates: ~30 files to move/refactor

**File with most issues:** `apps/docs/src/components/docs/entity/EntityHeader.tsx` (H3, M3, M7 ×2, M28 nearby, L1, L9) — 6 findings touch this one file; plus it's a 227-line component that should split.
**Most common antipattern:** `h-N w-N` equal-axis pairs (17 occurrences, M7) and `outline-none` (6 occurrences, M6). After tailwind-v4 sweep, the dominant remaining antipattern is the `as unknown as` double-cast cluster (8 occurrences across H2/H3/H4).

---

## Tool reconciliation (TASK-08.5 cross-check, 2026-05-25)

### knip findings (run `pnpm knip` from repo root)

- **Unused files (7 in apps/docs):**
    - `src/components/docs/entity/functions/FunctionSignaturesSection.tsx`
    - `src/components/docs/entity/signatures/SignatureCard.tsx`
    - `src/components/docs/entity/utils/renderers/renderParameterBadge.tsx`
    - `src/components/docs/entity/utils/renderers/renderVariable.tsx`
    - `src/components/ui/CodeBlock.tsx`
    - `src/components/ui/CodePanel.tsx`
    - `src/components/ui/Tooltip.tsx`
- **Unused dependencies in apps/docs/package.json:** `@radix-ui/react-tooltip`, `@seedcord/docs-generator` (build-time only; likely knip false positive), `tailwindcss` (CSS import, likely false positive), `type-fest`, `typedoc` (build-time only, likely false positive). Real removals only after verifying each isn't loaded at build time.
- **Unused devDependencies:** `@seedcord/tsconfig` (tsconfig extends; false positive). Keep.
- **Unused exports (selected):** `SIGNATURE_CONTAINER_CLASS`, `buildEntityTags`, `CATEGORY_CONFIG`, `escapeAttribute`, `normalizeInlineCode`, `sanitizeInternalHref`, `DOUBLE_NEWLINE`, `formatComment`, `DEFAULT_PACKAGE`, `EXTERNAL_DOCUMENTATION_LINKS`, `listDisplayPackages`, `DEFAULT_VERSION_SEGMENT`, `getEntityRouteSegment`, `ENTITIES`, `default` (`clearHistory.ts`), and others.
- **Duplicate exports (named + default):** `Sidebar`, `CommandPalette`, `Button`, `clearDocsHistory`, `useUIStore`. Pick one form per file.

### react-doctor findings (run `pnpm react-doctor --verbose`)

Score: **78/100 (Great)** on apps/docs. **105 issues across 60/152 files**. Initial run surfaced `deslop/unused-dev-dependency` mirroring knip. Full per-run diagnostics path is printed at the end of each `react-doctor --verbose` invocation — capture it when reviewing.

### Tool limitation noted

- react-doctor < 0.2.5 didn't resolve workspace catalog refs (e.g., `react: catalog:react`). Failed with "No React dependency found". Fixed in 0.2.5 (upstream PR #313 merged 2026-05-22). TASK-08.5 pins to 0.2.5+.

### Owner for fixes

These findings are NOT addressed in TASK-08.5 (install + tool wiring only). Real fixes happen here, in TASK-09. Triage rule: a real finding must either be fixed in TASK-09 OR have a justified suppression added to the tool config with a comment explaining why.
