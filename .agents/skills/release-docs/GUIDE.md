# Guide

The guide gets the most work and the most agents. It runs in two halves: the structure is settled with the maintainer, then the pages are written and reviewed autonomously while the maintainer is away.

The `guide-voice` skill and its two review prompts decide what a page says. This file covers the process around them.

## 1. Settle the structure (with the maintainer)

1. Read the research reports, the guide notes file, and every pending changeset.
2. List the pages the release makes stale, the facts that have no page yet, and the gaps users reported. A gap the maintainer names counts too, like "writing a plugin needs its own pages".
3. Propose the structure: the pages to rewrite, add, merge or delete, and any new tab. Present it as a table, then ask the open decisions through `AskUserQuestion`.

Done when the maintainer signs off on the page list. Settle where shared facts live too. On the Vite release, envapt got a short mention where a first bot reads config and a full page in Build & deploy, and `seedcord commands` got a CLI page in Tooling plus a "how commands reach Discord" page in Commands. From here the run can go unattended, so it can't wait on an approval prompt. Run every command the hooks pass ([SESSIONS.md](SESSIONS.md#hook-safe-commands)), and give every agent the same rule.

## 2. Set up the run

1. Fix the path of every new tab and page before any writer starts, so cross-links point at the right place from the first draft. A tab is any folder whose `meta.json` sets `"root": true`, so a new folder needs no code change.
2. Start the guide dev server with twoslash in the background, sandbox off, on a free port, and leave it running. Pages live under `/guide/`. Stop any other dev server first, since twoslash needs the memory. Restart it when `curl` fails.
3. Write one shared writer brief to the scratchpad. [PROMPTS.md](PROMPTS.md#guide-writer-brief) has the template. Each writer's prompt then adds only its own tab, its files, and what the release changed there.
4. Start a run log beside it: what the maintainer settled, the tab order with a status for each, and what to re-read after a compaction.
5. Pick a backup folder that survives a reboot, outside `/tmp`. Copy the run log, the brief, the notes file and the research reports there now, and again at every snapshot.

## 3. Write and review

1. Write one tab at a time, in tab order. Two writers can run together when their files don't overlap. Each writer edits only its own tab's files, checks every behavior claim by running code, and reports what it applied, skipped and suggested.
2. Snapshot the tab when its writer reports: its files and a `git diff` patch, into the backup folder.
3. Read the pages yourself, then review them with two Sonnet agents in parallel, one with `PROSE-REVIEW.md` and one with `CONTENT-REVIEW.md` from the `guide-voice` skill. Those prompts are written for one page each. Give each pair a batch of three or four pages instead, and keep the rest of the prompt as written. Check every finding at source before you apply it.
4. Render-check every page: `curl` it with its trailing slash, and look for twoslash's error marker. A failed twoslash sample turns the whole page into a 500.
5. Snapshot again, then stage exactly that tab's files. When the maintainer is around, they review and commit each tab before the next one is staged, so at most two tabs are ever uncommitted. When they're away, keep each tab's files listed in the run log, ready to stage one tab at a time.
6. After a new tab, send a cold reader that knows nothing about seedcord, with real tasks to do from the guide alone, like "deploy a bot to Workers" or "publish a plugin". Fix what it trips on. A cold reader on the old pages before the rewrite adds little once the research has mapped their gaps.
7. Review in loops until the findings turn into wishlist items. Then judge each finding on its own and stop the loop.
8. A cross-link pass over the whole guide, then check the tab bar at every screen width.
9. Last, run one audit per pattern across every page of the guide, the pages nobody touched included. Per-page reviews never catch a pattern spread across tabs, or one in text written after the reviews ran. The audits that found real problems on the Vite release:
    - joins between paragraphs (`PROSE-REVIEW.md` pass 21)
    - every `and` that joins two clauses, against the relation it promises
    - a requirement on the author written as behavior
    - code samples and kit components, the `^?`, `^|` and `hovers` markers included
    - callouts against section 7
    - release history written into a page
    - advice that breaks in production (`CONTENT-REVIEW.md` check 9)

    Give each audit to one helper. It reads the skill sections behind its pattern, reports only, and gives each finding's line, the full sentence, and what's really going on, without a replacement sentence. Write each fix for its own sentence, even when the maintainer showed the rule with one example, then reread every changed line in its paragraph for flow. Splitting every sentence in two reads worse than the original.

Done when the last review round brings back only wishlist items, the cold readers can finish their tasks, and the audits come back clean.

## Standing rules

- The code is the source of truth. Ground every claim in it.
- Link between pages, but keep each fact on one page.
- Every sample uses the most specific API there is, from real exports.
- A sentence about the page itself ("Come here for an exact signature...") answers a question in the wrong place. Find the question and answer it with a fact, or move it into the link text. Fix the pattern at its root in the `guide-voice` skill too.
- When a page moves, update the links in the READMEs. The guide notes file lists them. TSDoc and error messages carry no guide links, because a link in a published package goes dead when a page moves.
- Run `guide-voice` over all public TSDoc the release touched.
- Hold every file the branch touches to `code-commenting-guidelines`, `writing-voice` and `code-quality`, strictly.
- Update the guide's dependencies.
- Test the site end to end on mobile and desktop. Sweep every route against the static build on another port, since `next dev` runs out of memory on a full sweep. Check that the OG image and the Discord card render.
- Spike in the scratchpad or the OS temp folder, and clean up after.

## What worked before

- Round 1 of the reviews found wrong claims everywhere. Round 2 found library bugs and contradictions. Round 3 found mostly wishlist items.
- Content reviews that run code found real library bugs, and each one got a failing test and a root-cause fix.
- Cold readers with concrete tasks found gaps no reviewer saw, like two pages with conflicting setup snippets.
- Sonnet writers held up. Opus writers used up the usage limit.
