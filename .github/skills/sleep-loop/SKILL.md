---
name: sleep-loop
description: Use this skill whenever you need to ask the user questions and wait for their answers before proceeding. This defines the mandatory temp.md loop workflow for all CPI411 MOBA agents — including how to write questions, sleep-wait for answers, and loop until all questions are resolved. NEVER end the session or return control to the user while waiting; always sleep and re-read.
---

# temp.md Loop Workflow

This is the authoritative wait-loop protocol for all CPI411 MOBA agents. Follow it exactly every time you need user input.

IMPORTANT: After writing to a sleep-loop file, you HAVE TO ALWAYS run `sleep 1` in the terminal before doing ANYTHING ELSE at all. This is an order and has to be followed no matter what — do not proceed, read, or act on anything whatsoever. until you have slept 1 second after writing to it.

## ⚠️ CRITICAL RULE — NO EARLY SESSION TERMINATION

**You MUST NOT end the session, return, or yield back to the user while waiting for answers.**

Writing your questions to `temp.md` and then stopping is a failure. The whole point of this workflow is that you remain active, sleeping and re-reading, until you have everything you need. The user edits `temp.md` while you sleep — they do not send a new chat message.

**Forbidden patterns:**

- ❌ "I've written my questions to temp.md — please answer them and let me know when you're done."
- ❌ Returning after writing questions, expecting the user to start a new session.
- ❌ Asking questions in the chat window instead of temp.md.

## The Loop

```
1. Write questions to .vscode/temp.md
2. sleep 1 (terminal)
3. Read .vscode/temp.md in full
4. If user answered → continue
5. If not answered yet → GOTO 2 (keep sleeping, do NOT end session)
6. If follow-up questions needed → APPEND to temp.md (do NOT overwrite), GOTO 2
7. Loop until all questions are resolved
```

## Step-by-step

### Step 1 — Write questions to temp.md

Create or overwrite `.vscode/temp.md` with this structure:

```markdown
# [Agent Name] — Questions

## Context Gathered

- [Brief summary of what you've understood so far]
- [Any constraints or patterns found in the codebase]

## Questions

**Q1: [Specific question]**

- Option A: [choice]
- Option B: [choice]
- Other: \_\_\_

> <Replace_with_your_answer_here>

**Q2: [Next question]**

- Option A: [choice]
- Option B: [choice]

> <Replace_with_your_answer_here>

---

**Other notes:** [User fills in here]
```

### Step 2 — Sleep and re-read

Run `sleep 1` in the terminal. This gives the user time to open and edit temp.md.

After sleeping, read the entire file. Do not assume it's been updated — check for actual content in the "Your answers:" section.

**If no answers yet:** Sleep again. Do not end the session. Keep sleeping in 1-second increments until the user responds.

### Step 3 — Handle follow-ups

If you have more questions after reading the answers:

- **APPEND** a new section to temp.md. Do NOT overwrite the previous exchange.
- Format: add a `---` separator and a new `## Follow-up Questions` block.
- Sleep 1 and re-read again.

### Step 4 — Termination condition

Stop looping when one of these is true:

- All questions in temp.md have been answered.
- You find exactly `AGENT, CONTINUE.` in temp.md (skip remaining questions and proceed).
- You find `START IMPLEMENTING` in temp.md (proceed immediately with implementation).

## Fallback: If sleep doesn't work

If the `sleep` command is unavailable or broken in your terminal environment, use a read-loop instead:

```
loop:
  read .vscode/temp.md
  if file contains "AGENT, CONTINUE." or answers → break
  wait briefly, loop again
```

## File naming fallback

If you cannot write to `.vscode/temp.md` (permissions, lock, etc.), use incremented names:

- `temp1.md`, `temp2.md`, `temp3.md`, ...

Tell the user which file you wrote to so they know where to answer.

## Orchestrator variant

The Orchestrator uses `orchestrator-temp.md` instead of `temp.md`. The loop rules are identical — same sleep, same append-only policy, same no-termination rule.
