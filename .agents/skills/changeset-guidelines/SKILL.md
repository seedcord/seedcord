---
name: changeset-guidelines
description: Use this when writing or reviewing a changeset in `.changeset/*.md`. Covers how behavior decides the release type, the opening word for a bug fix, and how much of a mechanism one sentence should carry, drawn from a real review where one changeset needed ten corrections before it shipped.
---

# Changesets

A changeset becomes a changelog entry, which someone scans while deciding whether an upgrade breaks their bot. Get the release type right first, then say what changed once, in the reader's own case.

This skill decides what a changeset says. `writing-voice` covers how any sentence in this repo sounds. `release-version` covers cutting the release itself.

The shape is fixed, and `pnpm lint:changesets` rejects anything else:

- One paragraph on one line. No second paragraph, list, heading, quote, or code block.
- At most two sentences for a patch and three otherwise. One sentence is fine when it already carries the reader's own case. A second sentence carries that case when the first one cannot.
- `**BREAKING:**` plus a space opens the summary when the change breaks. The changeset bumps no package as a patch, and a `major` bump is only for a package already past 1.0.

---

## 1. Behavior decides the release type

Ask whether a running bot behaves differently after the upgrade. Never ask whether the types still compile. Pre-1.0 in this repo, a yes answer means a `minor` bump carrying the bold `**BREAKING:**` prefix.

A durable store keyed on the old behavior changes silently. In the worked example below, every persisted cooldown window reset on upgrade, and nothing in the build said so.

---

## 2. Open with what kind of entry this is

A bug fix opens with `Fixed`. A second fix gets its own changeset.

Why: a changelog gets scanned, so the first word has to say what kind of entry this is. Each changeset becomes one changelog entry, and two fixes in one entry make the reader untangle them.

---

## 3. Write the reader's own case

```txt
BAD: "a handler registered on several routes"
GOOD: "a handler registered on two buttons"
```

Why: the reader matches the entry against their own code. "Several" makes them do that work themselves.

---

## 4. Name the mechanism once

Never list the fields it touched.

```txt
BAD: "`interactionDispatched.routeId`, `responseAttempted.routeId`, and the dispatch bag used to carry every route the class declares"
GOOD: "its route id joined both into `button:confirm,cancel`"
```

Why: a field list restates the diff. One sentence about the mechanism covers all of them.

---

## 5. Run cause into effect

Keep a thread between sentences.

```txt
BAD: "Clicking one used to put both on cooldown. Each gets its own instead."
GOOD: "Because its route id joined both into `button:confirm,cancel`, clicking either one put both on cooldown."
```

Why: splitting every clause to dodge connectors leaves stubs, and the reader has to rebuild the relation you cut out.

---

## 6. Match the connector to the relation

```txt
BAD: ", and now each has its own"
GOOD: "instead", or a fronted "Because ..."
```

`and` means "also". Here the second half replaces the first.

Why: the wrong connector asserts a relation that is not there.

---

## 7. Give a value a job

```txt
BAD: "Each gets its own instead, `button:confirm`."
GOOD: "Now it would just be `button:confirm`, for example."
```

Why: an id hanging off a comma has nothing to attach to, so it reads as debris.

---

## 8. Mark an illustrative value as illustrative

```txt
BAD: "The id now reads `button:confirm`."
GOOD: "Now it would just be `button:confirm`, for example."
```

Why: the real value depends on which route matched. Stated flat, it reads as the only value.

---

## 9. Stop once the reader can derive the rest

```txt
BAD: "The id now reads `button:confirm`, so each button keeps its own."
GOOD: "Now it would just be `button:confirm`, for example."
```

Why: the previous sentence already said both went on cooldown. Narrowing the id makes the consequence the reader's next thought.

---

## 10. Fix the wording, keep the fact

```txt
BAD: deleting both example ids because the word "instead" appeared twice
```

Why: the ids are the greppable part. A repeated word is the cheaper thing to change.

---

## 11. Say that it changed

```txt
BAD: "A bot installs its SIGINT and SIGTERM handlers in `start()`."
GOOD: "A bot now installs its SIGINT and SIGTERM handlers in `start()`."
```

Read the other changesets in `.changeset/` first and match their tense.

Why: a plain present-tense sentence reads like docs describing how things always worked. A changelog reader scans for what moved, and `now`, `no longer`, or an opener like `Fixed` or `Added` tells them.

---

## The worked example

One real change, a `Cooldown` keyed a route id that a two-button handler shared. First draft through final.

First draft, rejected:

```md
**BREAKING:** A handler registered on several routes now reports the route that matched. `interactionDispatched.routeId`, `responseAttempted.routeId`, and the dispatch bag used to carry every route the class declares, joined with commas. A `Cooldown` on such a handler runs one window per route.
```

Middle draft, rejected. The maintainer said "I had to read it multiple times over":

```md
Fixed one click cooling down every route on a handler that covers several. The dispatch id now names the route that matched, `button:confirm` where it used to read `button:confirm,cancel`.
```

Accepted:

```md
**BREAKING:** Fixed the cooldown on a handler registered on two buttons. Because its route id joined both into `button:confirm,cancel`, clicking either one put both on cooldown. Now it would just be `button:confirm`, for example.
```

---

## Deduping before a release

The changelog credits each changeset to the PR whose commit added its file. `@changesets/git` finds that commit with `git log --diff-filter=AC --follow`, and `scripts/src/release/ChangelogRenderer.ts:20` reads the `(#N)` at the end of its subject.

- Rewrite the text in place, in the file from the PR you want credited, then delete the duplicates.
- A renamed file keeps its credit while its text stays close to the original. `--follow` matches a rename by content, so rename and rewrite in separate commits.
- Never write a new file to hold merged text. It would credit the dedupe PR.
- When one line covers two PRs, only the surviving file's PR gets linked. Write the other one into the text as a bare `#N`.

---

## Related

- `writing-voice` for word choice and punctuation across every sentence in this repo.
- `release-version` for cutting the release and the pre-mode flows.

This skill decides what a changeset says. Those two decide how the words sound and how the release runs.
