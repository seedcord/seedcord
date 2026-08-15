# Packages

Rules for the framework leaves under `packages/`. The root [`AGENTS.md`](../AGENTS.md) still applies.

Most of these publish.

---

## The exports map is the surface

A package's `exports` block in its `package.json` decides what consumers can import. Adding a file to `src/` publishes nothing until the map names it.

`./internal` entries carry framework wiring between packages. A symbol reachable only through one has no outside consumer. It gets no TSDoc block, and a changeset never mentions it.

Export a symbol when a caller has to write its name: in a variable annotation, a parameter or return type, or an `extends` clause. A helper type that only appears as the shape of another exported type's field stays internal. The parent's declaration still resolves it in the emitted `.d.ts`.

Before adding `export`, confirm something outside the file names the symbol. Before removing one, grep every consuming surface including markdown and generated output.

---

## New packages

Scaffold with `turbo gen package`. Then follow the wiring checklist in `turbo/generators/README.md`. Copying an existing package by hand misses steps.

---

## Types

- **No `any` in _any_ code.** Narrow through a type guard, or use `unknown` and a guard. A cast is rarely the answer.
- **No `as unknown as T`.** Fix the declaration, write a guard, or change the API.
- **Derive, never restate.** A constructor shape is `TypedConstructor<typeof X>` (see `packages/gateway/src/handlers/constructors.ts`). A member union comes from `keyof`, `TypedExtract`, an indexed access, or a template-literal map over the owning enum. A narrowed copy uses `Pick` or `TypedOmit`.
- **Check `@seedcord/types` first** for a project alias. Then `type-fest` for a structural transform. A cast is rarely the answer.
- `?.` and `??` belong on genuinely optional branches. Reaching for them to quiet an error hides a broken assumption.

The shared `tsconfig` turns on `exactOptionalPropertyTypes`. An optional property declared `foo?: string` rejects an explicit `undefined`. Write `foo?: string | undefined` when a caller passes one through.

---

## Errors

Every throw carries a registered code from `SeedcordErrorCode`. Message strings get reworded between releases. The codes stay, so branch on the code.

`isSeedcordError(error)` narrows to any seedcord error. Passing the class name and a code narrows to one specific failure.

Translate a third-party throw into a seedcord error before it reaches a consumer.

---

## Changesets

Every change to a published package needs one. Run `pnpm cs`.

A changeset is one or two plain sentences naming the user-visible change. Skip the sub-changes that rode along, since the changelog reader has the diff. Mark a breaking change with a bold `**BREAKING:**` prefix line.

Say nothing about a change that only touches an `./internal` entry.

---

## Tests

Tests live in `<package>/tests/` mirroring `src/`. Run `lint:fix`, then `tc`, then `test`.

`id` on a discord.js structure is a prototype getter, so build a stub with `Object.create(proto)`. A plain object literal leaves `id` undefined.
