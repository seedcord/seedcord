---
name: tailwind
description: Use this when writing Tailwind CSS in any seedcord app or in @seedcord/ui. Covers the v4 CSS-first setup with @tailwindcss/postcss (Next.js), the shared tokens, cn() and tw template helpers, @theme CSS variables, opacity modifiers, responsive discipline, size/padding shorthands, container queries, and v4-specific gotchas that differ from v3.
---

# Tailwind CSS v4 (Seedcord Conventions)

The Next.js 16 + React 19 apps under `apps/{docs,guide,home}` use **Tailwind v4** via the `@tailwindcss/postcss` plugin. There is no `tailwind.config.js` and no v3 directives. `tooling/ui` (`@seedcord/ui`) holds the shared primitives, the `cn` and `tw` helpers, `styles/tokens.css` and `styles/globals.css`. An app adds only what's specific to it, like the docs app's entity colors in `apps/docs/src/styles/tokens.css`.

If the same pattern shows up in two apps, move it to `@seedcord/ui`.

---

## Setup Pattern (v4 + Next.js 16)

An app's stylesheet opens with the shared one, then adds its own:

```css
/* apps/<name>/src/app/globals.css */
@import '@seedcord/ui/styles/globals.css';
@import '../styles/callout.css'; /* optional: app-specific styles */
```

```js
/* apps/<name>/postcss.config.mjs */
const config = { plugins: { '@tailwindcss/postcss': {} } };
export default config;
```

```ts
/* tailwind class scanning is automatic in Next.js 16; no @source needed unless you author
   class strings in a file outside the app's tree (e.g. shared package). */
```

**Never use the old v3 directives** (`@tailwind base`, `@tailwind components`, `@tailwind utilities`). They don't exist in v4.

**If you author Tailwind class strings inside a package** that these apps consume and the app doesn't scan yet, add a `@source` line in the consuming app's `globals.css` pointing to it. Without it, v4's scanner won't find those classes and they'll be purged in production.

---

## Rule 1: Use `cn()` for dynamic classNames

`cn` comes from `@seedcord/ui`. It wraps `clsx` + `tailwind-merge`:

- Deduplicates conflicting Tailwind utilities: `cn('px-2', 'px-4')` → `'px-4'`.
- Filters falsy values, so you don't need `.filter(Boolean)` or empty-string ternaries.

```tsx
// Bad
const cls = ['base', isActive ? 'bg-(--flesh)' : ''].join(' ');

// Good
import { cn } from '@seedcord/ui';
const cls = cn('base', isActive && 'bg-(--flesh)');
```

**The only legitimate use of `.join(' ')` in this repo** is joining non-className strings (CLI args, log fragments).

---

## Rule 2: Use the `tw` template tag for multi-line class strings

`@seedcord/ui` also exports `tw`, a template tag that normalizes whitespace and lets you keep `prettier-plugin-tailwindcss` formatting on long class strings:

```tsx
import { cn, tw } from '@seedcord/ui';

const buttonBaseClassName = cn(
    tw`inline-flex items-center justify-center gap-2`,
    tw`rounded-md border border-transparent font-medium`,
    tw`disabled:cursor-not-allowed disabled:opacity-50`
);

const buttonVariantClasses = {
    primary: tw`shadow-soft bg-(--flesh) text-white hover:bg-(--flesh-hover)`,
    outline: tw`border-(--border) bg-transparent text-(--text)`
};

<button className={cn(buttonBaseClassName, buttonVariantClasses.primary, className)} />;
```

This is how `tooling/ui/src/Button.tsx` is structured. Mirror it. Don't invent a parallel "styled" abstraction.

---

## Rule 3: Read colors from the shared tokens

`@seedcord/ui`'s `styles/tokens.css` holds the brand colors (`--flesh`, `--rind`) and the names components read (`--bg`, `--text`, `--border`, `--flesh-hover`), for both themes. Add a new token there when you find yourself repeating a `color-mix(...)` expression.

**Reference tokens via `bg-(--token-name)` (v4 paren syntax). The `bg-[var(--token-name)]` v3 bracket syntax doesn't apply in v4.**

```tsx
// Bad: v3 syntax / arbitrary hex
<div className="bg-[var(--flesh)] text-[#f04e36]" />

// Good: v4 paren + token
<div className="bg-(--flesh) text-(--flesh)" />
```

---

## Rule 4: Use color-mix for derived shades

`tokens.css` already does derived hovers and subtle variants with `color-mix(in oklab, …)`:

```css
--flesh-hover: color-mix(in oklab, var(--flesh) 88%, black);
--flesh-transparent-subtle: color-mix(in oklab, var(--flesh) 8%, transparent);
```

Never hard-code a darker hex by eye when `color-mix` (or Tailwind's `bg-color/50` opacity modifier) gives a derived value that updates if the base token changes.

---

## Rule 5: Class shorthands (catch by review)

### Collapse equal `w-N h-N` to `size-N`

When both axes are equal, collapse to `size-N`:

```tsx
// Bad
<div className="w-4 h-4" />
<Icon className="w-6 h-6" />

// Good
<div className="size-4" />
<Icon className="size-6" />
```

Exception: when axes differ (`w-8 h-4`), keep them separate.

### Collapse equal `px-N py-N` to `p-N`

```tsx
// Bad
<div className="px-6 py-6" />

// Good
<div className="p-6" />
```

### `font-semibold` on headings (never `font-bold` / `font-extrabold` / `font-black`)

```tsx
// Bad
<h2 className="font-extrabold">Title</h2>

// Good
<h2 className="font-semibold">Title</h2>
```

Heading elements (h1-h6) must use `font-semibold` at most. This is review-enforced. Catch it in code review.

---

## Rule 6: Responsive discipline (mobile-first)

Tailwind breakpoints: `sm` (640px) `md` (768px) `lg` (1024px) `xl` (1280px).

**Mobile-first always.** Write the mobile default first, add `sm:`/`md:`/`lg:` for larger viewports:

```tsx
// Bad: desktop-first (shrinking on larger screens is wrong direction)
<div className="text-2xl md:text-lg" />

// Good
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
<div className="text-sm md:text-base lg:text-lg" />
```

For JS-driven breakpoint checks, prefer matchMedia in a `useEffect` over reading `window.innerWidth` on render (which crashes during SSR).

**v4 behavior change:** `hover:` only fires on devices that support hover (pointer: fine). It no longer triggers on mobile tap. This is correct and intentional. Don't try to work around it.

---

## Rule 7: Avoid arbitrary values when a token exists

```tsx
// Bad: both have token equivalents
<div className="border-[#3e3f29]" />                              // → border-(--text) or similar
<div className="text-[#f04e36]" />                                 // → text-(--flesh)
```

Arbitrary values are acceptable only when the design genuinely requires a one-off value that isn't and shouldn't become a system token.

**CSS variable arbitrary values** use parentheses in v4:

```tsx
// Bad: v3 syntax
<div className="bg-[--my-custom-var]" />

// Good: v4 syntax
<div className="bg-(--my-custom-var)" />
```

---

## Rule 8: Co-locate component variants with the component

For a primitive in `tooling/ui/src`, put the base classes and the variant classes as `tw` constants at the top of the component file. Don't invent a `cva`-style abstraction. `tooling/ui/src/Button.tsx` is the convention.

---

## v4 Gotchas vs v3

| Pattern | v3 | v4 |
| --- | --- | --- |
| Opacity utilities | `bg-opacity-50` | `bg-color/50` (old removed) |
| CSS var in arbitrary | `bg-[--var]` | `bg-(--var)` |
| Important modifier | `!flex` | `flex!` |
| Bare `ring` class | 3px blue | 1px currentColor (write `ring-3 ring-(--flesh)`) |
| Bare `border` class | gray-200 | currentColor (always add a color) |
| `outline-none` | hides outline | sets `outline: none` literally (use `outline-hidden` to visually hide) |
| Shadow scale | `shadow-sm` is small | `shadow-sm` in v4 = v3's bare `shadow` (scale shifted down) |
| Container queries | requires plugin | built-in (use `@container` + `@sm:` directly) |
| `hover:` on mobile | fires on tap | only on hover-capable devices |
| Config | `tailwind.config.js` | `@theme {}` in CSS or `:root` custom properties |
| Content scanning | `content: []` in config | automatic in Next.js (`@source` for files outside the tree) |

---

## Container Queries (built-in in v4)

No plugin needed. Use `@container` on the parent and `@sm:` etc. on children:

```tsx
<div className="@container">
    <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3" />
</div>;

{
    /* Named container */
}
<div className="@container/card">
    <p className="text-sm @md/card:text-base" />
</div>;
```

---

## Anti-patterns checklist

| Pattern | What to do instead |
| --- | --- |
| `bg-[#hex]` when a token exists | `bg-(--token-name)` |
| `bg-opacity-50` | `bg-color/50` |
| `bg-[--var]` | `bg-(--var)` |
| `[a, b].join(' ')` for classNames | `cn(a, b)` from `@seedcord/ui` |
| `w-N h-N` same value | `size-N` |
| `px-N py-N` same value | `p-N` |
| `font-bold` / `font-extrabold` on headings | `font-semibold` |
| Inline variant map mixed into JSX | Lift to `tw\`…\`` `VARIANTS` const above the component |
| Duplicating a primitive across apps | Move it to `@seedcord/ui` |
| Tokens defined in two apps | Move them to `@seedcord/ui`'s `styles/tokens.css` |
| `window.innerWidth` read during render | Use matchMedia in `useEffect` |
| New shared package authoring class strings, no `@source` | Add `@source` pointing to it in the consuming app's globals |
| `outline-none` to hide focus ring | `outline-hidden` |
| `@tailwind base/components/utilities` | `@import 'tailwindcss'` |
| `bg-[var(--token)]` (v3 var-in-bracket syntax) | `bg-(--token)` (v4 paren syntax) |
