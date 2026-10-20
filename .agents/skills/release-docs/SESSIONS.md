# Sessions and agents

## Helper sessions

The maintainer opens a second Claude session and names it, like "guide helper". The main session reaches it with `ListAgents`, then `SendMessage` to that name. The helper replies the same way, and its message arrives in the main session's turn.

- A helper may be busy with the maintainer's own work. When it says so, ask the maintainer to open another one, and send the job there.
- A renamed session keeps its address under the new name. Run `ListAgents` again when a send fails.
- Make each job message stand alone. The helper has none of this session's context, so the message lists the skills to load, where ground truth is, the rules, the batches, and the report format. [PROMPTS.md](PROMPTS.md#readme-batches) has a full example.
- Split a long job into batches. The helper stops after each batch and waits for a go, so you can review it before the next batch builds on it.
- Tell every helper and every writer to spawn no subagents or workflows, and to skip the review step in `guide-voice`'s loop. The main session runs every review. Skills they load, like `guide-voice` and `code-quality`, tell them to start agents, and those agents never show up in your count. One helper on the Vite release started five.
- Every helper works in its own worktree when it changes code, or in named files of the shared worktree when it writes docs. Tell it which folders the main session is using, so it stays out of them.

## Subagents

- Set the model on every agent, `sonnet` by default.
- Give a research agent the question, the scope, the output shape, and the map of ground truth. Never give it your guess at the answer.
- Ground truth for seedcord: the code at HEAD, read through the codebase-memory MCP (project `Users-dhruv-Desktop-seedcord-seedcord`). The maintainer's ratified decisions are settled. Explorations, spikes and ideas are candidate material.
- Have it write its report to a file in the scratchpad and reply with a short summary. Read the file, never the agent's transcript.
- Paste the hook-safe line below into every prompt.

## Hook-safe commands

Paste this line into every agent prompt and every helper job:

> Never use `sed -i` or `perl -i` on any file, temp files included, and never write a file from the shell (no `>` into a file, no heredoc that writes). Use the Write and Edit tools for every file change. Pipe plain `sed` or `awk` to stdout for transforms.

The maintainer's `no-shell-file-writes` hook asks for approval when `sed -i` shares a command with `grep`, `find` or a glob, unless every file the command names is a scratch file. That one prompt holds the whole session until someone answers it. Other hooks deny outright, which only costs a retry.

Also keep these off the autonomous path:

- `perl` in any form
- `pnpm` commands and git writes inside the sandbox, which fail with errors that look like real bugs. Run them with the sandbox off.
- anything that publishes, deploys, or posts outside the machine
