# Apps

Rules for `apps/docs`, `apps/guide`, and `apps/home`. The root [`AGENTS.md`](../AGENTS.md) still applies.

All three run Next.js with React 19 and Tailwind v4. None of them publish.

---

## Shared UI comes from `@seedcord/ui`

Every primitive lives in `tooling/ui/src/`. Read that folder before you build anything.

`react/forbid-elements` catches raw `<button>`, `<input>` and `<select>`. A one-off style means the primitive is missing a variant. Add it there and inline nothing. An element that fills a different job, a listbox option or a mock of another product's interface, takes an inline disable naming the reason.

`cn()` for class composition comes from `@seedcord/ui`. One definition serves all three apps.

Design tokens live in `@seedcord/ui` as `tokens.css` and `tokens.ts`. Read a color from a token. An inlined hex splits the look across the apps.

An app-local `src/components/` folder holds pieces specific to that app. A pattern that shows up in a second app moves to `@seedcord/ui`. Migrate the first app off its local copy in the same change.

---

## React 19

- `use(Context)` replaces `useContext(Context)`. `ref` is a normal prop, so `forwardRef` is gone.
- **No array index as a React key.** Use a stable identity: an id, a slug, or the content string for a static list.
- **No mutable values in dependency arrays.** `location.pathname` and `ref.current` trigger no re-render.
- **Nothing that differs between server and client may be reachable from JSX during SSR.** `new Date()`, `Math.random()`, and `window.*` belong in `useEffect`, backed by state.
- `useState(propValue)` needs a sync path when the prop can change from outside. Add a `useEffect` that sets state on the prop, or remount through a `key`.
- **`.filter().map()` becomes one `.reduce()`.** `array.includes()` inside a loop becomes a `Set` built once outside it.
- No barrel imports inside the same app when the direct file sits one folder away.

`pnpm react-doctor` catches many of these. Make sure to run it yourself.

---

## Tailwind v4

Three syntax changes from v3 that older examples get wrong:

- `bg-(--token)` replaces `bg-[var(--token)]`
- `bg-color/50` replaces `bg-opacity-50`
- `outline-hidden` replaces `outline-none`

Use the `tw` template tag for multi-line class strings.

---

## Type and prose

`<h1>` through `<h6>` take `font-semibold`. Bold weight crushes counter shapes at display sizes.

No em dash in JSX text. Use a comma or parentheses.

---

## Design fidelity

When a mock is provided, treat it as ground truth. Every visible difference between the mock and the build is a bug until someone writes it down as descoped. A deviation needs a justification in the PR description.
