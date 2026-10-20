# Prompts

Templates that worked on the Vite release. Fill in the `<angle brackets>`, and keep the rest as written. Each one already carries the hook-safe line.

## Changesets

Run it in the main session.

```txt
Read every changeset on this branch against the actual diff (git diff main...HEAD for each package). Merge the ones that describe one change in several steps, and delete the ones that describe something a later change undid. Rewrite each survivor per the changeset-guidelines skill, and keep **BREAKING:** on the majors.

Then dedupe against each package's version on main. A fix for a bug that only exists on this branch gets folded into the changeset that introduced the code, or deleted. A bug that exists on main keeps its own entry. Check each one against main's source.

Then list the breaking changes, and which of them change behavior with nothing to warn the user, like a different error code or a different return value.
```

## Research

Send three of these in one message, each with its own area. On the Vite release the areas were:

- the CLI's config, build and deploy paths
- the CLI's dev, commands and codegen, plus the scaffolder
- the framework packages, plus what writing a plugin takes

```txt
You are doing read-only research for a docs update in the seedcord monorepo. Work in the worktree at <path>. The release is everything on this branch that is not on origin/main.

## Question
What changed for a bot author between origin/main and HEAD in <area>? Which lines in the user-facing docs are now wrong or missing because of it? <any extra question, like what writing a plugin takes end to end>

## Scope
<the folders this agent covers>. Other agents cover <the other areas>, so mention those only where your area touches them.
Docs to check against: the root README.md, every README.md under packages/, plugins/, cli/ and tooling/, the guide at apps/guide/content/docs, and the home site under apps/home/src.

## Where ground truth is
- The code at HEAD. Use git diff origin/main...HEAD -- <path> and read the files.
- For code structure, the codebase-memory MCP first, loaded through ToolSearch. Project Users-dhruv-Desktop-seedcord-seedcord.
- The maintainer's ratified decisions are settled. Explorations, spikes and ideas are candidate material, so never cite them as how the code works.
- Pending changesets in .changeset/ describe intent. Confirm each against the code.

## Rules
- Read-only. No pnpm, builds, tests, installs, or git writes. Nothing that needs a permission prompt.
- Never use sed -i or perl -i on any file, temp files included, and never write a file from the shell (no > into a file, no heredoc that writes). Use the Write tool for your report.
- Cite file:line for every claim about code. Label anything you did not open "assumption".
- Read the diff and the files you need, never whole directories.

## Output
Write a report to <scratchpad>/research-<area>.md with three sections:
1. Changes a bot author sees: what they write, run or get differently, file:line, the changeset, and whether it breaks existing bots.
2. Wrong or stale doc lines: doc file:line, what it says, what is true now with file:line.
3. Undocumented capabilities, with file:line, and what someone could build with them.
Then reply with a 5-line summary and the counts per section.
```

## Cold reader

For the READMEs. For the guide, swap the files for the guide's pages and the tasks for real ones, like "move a dotenv app over", "deploy a bot to Workers", or "publish your bot as a package".

```txt
You are a TypeScript developer who has built Discord bots with discord.js. You have never heard of seedcord, and you are deciding whether to use it.

Read only <the files>, the way you would on GitHub or npm. Don't open source code or anything else.

Do these tasks from those files alone, and write down where you got stuck, guessed, or lost interest:
1. In one sentence, what is seedcord and why pick it over plain discord.js? Say which file told you, and how sure you are.
2. <a real task, like "a slash-command bot on a VPS: what do you install first, and what are your next three steps?">
3. <another real task>
4. For each file: who is it for, and would you install that package directly? Mark any that read as useless, out of date, or contradicting another.
5. Which file made you want to try seedcord, and which made you less sure? Quote the sentences.

Read-only. Never use sed -i or perl -i, never write a file from the shell, and use the Write tool for your report. Quote the text you react to, with file and line.

Write your findings to <scratchpad>/cold-read-<surface>.md, one section per task, and reply with a 5-line summary.
```

## README batches

Send it to a helper session.

```txt
Job from <main session name>, approved by the maintainer: rewrite the remaining READMEs in the worktree <path>. The maintainer committed <the reference READMEs> there. Match their shape, voice and level of detail.

## Before writing
1. Load writing-voice, code-commenting-guidelines, and code-quality (every file) from .agents/skills. Read AGENTS.md's "Ground every claim".
2. Read the reference READMEs, and git log -p on them, to see what the maintainer kept and cut.
3. Read <the cold reader and research reports>. They are input, not evidence, so check every claim in the code.

## Rules
<paste "What a README carries", "Positioning" and "Facts that held" from READMES.md, updated for this release>
Prose: no em or en dashes, no semicolons in prose, no comma splices, no "not X, but Y" or "X, not Y" contrasts, no "names" as a verb, no anthropomorphism, no hype words.

## Batches. Stop after each one, SendMessage me, and wait for my go.
1. <packages>
2. <packages>
...

After each batch, run pnpm exec prettier --write <files> from the worktree root with the sandbox off. Then report: the files, one line per README on what changed, every fact you cut with the guide page it belongs on, and every claim you could not verify. Don't stage, commit or push. Stay out of <the folders the main session is using>.

Never use sed -i or perl -i on any file, temp files included, and never write a file from the shell. Use Write and Edit for every file change.
```

## Guide writer brief

Write it once to the scratchpad. Each writer's prompt is then short: "Read <brief path> first and follow it exactly", its tab and files, and what the release changed in that tab.

```md
# Guide writer brief

You write one tab of the seedcord guide for the upcoming release. <two sentences on what the release adds>

Worktree: <path>. Guide pages: apps/guide/content/docs/<tab>/. The dev server runs at http://localhost:<port>/guide/ with twoslash on. Never stop, restart or rebuild it.

## Planned pages (link to these paths even before they exist)

<every new tab folder and page slug, and every page that moves> Inside a page, link from the guide root without /guide, like [codegen](/tooling/codegen).

## Load first

1. .agents/skills/writing-voice/SKILL.md
2. .agents/skills/guide-voice/SKILL.md, then PROSE-REVIEW.md and CONTENT-REVIEW.md beside it
3. .agents/skills/code-commenting-guidelines/SKILL.md, for comments inside samples
4. apps/guide/content/dev/mdx-kit.mdx
5. Two or three committed pages in a neighbouring tab, to match the voice

## Where ground truth is

- The code at HEAD, through the codebase-memory MCP (project Users-dhruv-Desktop-seedcord-seedcord). Open every declaration you teach and read it whole.
- <the maintainer's settled rulings and the release's checklist of guide lines, by path>. Every checklist line that touches your tab must be handled, after you verify it in code.
- <the research reports and the guide notes file, by path>. They are input, not evidence.
- Pending changesets in .changeset/.

## How to write

- Follow guide-voice section 5 for every page.
- Run code to check every behavior claim. Spike in <scratchpad>/spikes/<tab>/ and delete it after. Never use a real Discord token.
- Every sample uses the most specific real API, from the exports map.
- Cross-link where the reader needs the other page at that point. Keep each fact on one page.
- A new page gets frontmatter per guide-voice section 7 and a place in its tab's meta.json.
- A sentence about the page itself answers a question in the wrong place. Answer the question with a fact, or move it into the link text.

## Check every page you touch

1. curl the page with its trailing slash: 200, and no "Errors were thrown" in the html.
2. Ten twoslash fences per page at most.
3. Every ref: link target exists.
4. pnpm exec prettier --write <files>.

## Rules

- Touch only your tab's files. No git writes, no pnpm install, no builds, nothing that needs a permission prompt.
- Don't spawn subagents or workflows. Do the work yourself, and skip step 10 of guide-voice's loop, since the main session runs every review.
- Never use sed -i or perl -i on any file, temp files included, and never write a file from the shell. Use Write and Edit. No perl at all.
- Report a library bug with a repro. Don't fix the library.

## Report

Write <scratchpad>/guide-tab-<tab>.md: per page what changed, skipped and suggested, every checklist line and how you handled it, library bugs, unverified claims, cross-links added and pages outside your tab that should link in. Reply with a 5-line summary.
```
