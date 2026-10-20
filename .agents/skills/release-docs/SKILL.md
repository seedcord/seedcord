---
name: release-docs
description: Bring every user-facing surface up to date for a seedcord release (changesets, READMEs, the home page, then the guide). A maintainer-run job across one main session, helper sessions, and Sonnet subagents.
disable-model-invocation: true
---

# Release docs

A release changes what users can do. This run makes every surface a user reads say so: the changesets, the READMEs, the home page, and the guide. Run it on the release branch once the code is done.

The maintainer judges everything a user reads. You do the legwork, ground every claim, and hand each phase over staged.

## Setup

1. Make a sibling worktree off local `next`, like `git worktree add -b docs-refresh ../docs-refresh next`, with the sandbox off. Open it with `code ../docs-refresh`, also outside the sandbox.
2. `pnpm install`, then build what each phase needs. The home site needs `pnpm turbo run build --filter='./apps/home^...'` before `next dev` starts.
3. Load the four skills `AGENTS.md` lists, plus `guide-voice` and `changeset-guidelines`.
4. Start a guide notes file in the session scratchpad. Every fact cut from a README or the home page goes in it, with the guide page it belongs on. The guide phase reads it.

Done when the worktree builds and the notes file exists.

## The run

Run the phases in this order. Each one ends when the maintainer commits it, and the next one reads what the last one settled.

1. **Changesets.** Merge the ones that describe one change, delete the ones a later change undid, and dedupe against `main` per the `changeset-guidelines` skill. [PROMPTS.md](PROMPTS.md#changesets) has the prompt. Done when every changeset was read against the diff and `main`'s source.
2. **Research.** Three Sonnet agents split the diff against `main` by area, and one cold reader reads the current READMEs. [PROMPTS.md](PROMPTS.md#research) has both prompts. Done when every report sits in the scratchpad and you have read them.
3. **READMEs.** [READMES.md](READMES.md). Done when every published README and every private stub is committed.
4. **Home page.** [HOME.md](HOME.md). Done when the maintainer commits it and the link preview card was checked in Discord.
5. **Guide.** [GUIDE.md](GUIDE.md). It starts in the loop with the maintainer and turns autonomous once the structure is settled. Done when the reviews reach diminishing returns and the cold readers finish their tasks.
6. **Close.** Dedupe the changesets against `main` once more, and check that the guide notes file has nothing left in it.

## Who does what

- **The main session** is the editor. It writes the positioning (the root README, the two transport READMEs, the CLI README, and the home page), makes the design calls, reads every helper's diff, checks their claims at source, and stages each batch.
- **Helper sessions** are other Claude sessions the maintainer opens and names. Long batch jobs go to them, like the other READMEs or a library bug fix. A helper keeps its loaded skills between jobs, so a second job costs less than a fresh agent. [SESSIONS.md](SESSIONS.md) covers how to use them.
- **Subagents** do research and review, always on Sonnet.

## Token budget

A past run used most of a week's usage in one day, because every agent re-reads the skills and the code before it does anything. That cost grows with each agent you add.

- Give each agent more work. Two agents covering half the diff each beat six covering a sixth.
- Run at most two workers at once, and count helper sessions as workers. The Vite release ran five at once, three helpers and two subagents, and every one of them stopped mid-page when the usage window ran out.
- Set `model: 'sonnet'` on every agent. Opus only for a real design call, and Fable never.
- Send a follow-up to a helper session that already has the context, instead of starting a new agent.
- Read a report's load-bearing claims yourself before acting on them. A claim you didn't check costs more later than the read costs now.

## Rules for every phase

- The maintainer reviews and commits. Stage each finished batch, then stop and report. Never commit or push.
- Every claim about behavior cites `file:line`, or says "assumption".
- Write commands the hooks pass without asking: [SESSIONS.md](SESSIONS.md#hook-safe-commands). An approval prompt stalls an autonomous run until the maintainer wakes up.
- A library bug found along the way gets a failing test, then a root-cause fix, in its own worktree. A helper session can take it.
- Ask decisions through `AskUserQuestion`, with the evidence in a message before it.
