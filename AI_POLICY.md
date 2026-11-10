# AI Policy

AI is fine here. I use it a lot myself. Just that there are a few rules if you're using it to contribute to seedcord:

- **Tell me you used AI.** Mention the tool (Claude Code, Cursor, Copilot, whatever) and roughly how much of the work it did. "Claude wrote the tests, I wrote the rest" is plenty. The PR template has a spot for it.

- **Know your code.** You should be able to explain what your change does, and how it fits into the rest of seedcord, without asking an AI. If I ask why something is the way it is, "the AI wrote it" isn't an answer.

- **Test it properly.** AI code looks right a lot of the time and still misses edge cases. Run `vp run prePush`, but don't stop at the unit tests. Run your change in one of the mock bots and use it the way someone building a bot would. Click the buttons, send the weird input, restart it halfway, read the error you get when you mess up the config. Some of this only gets caught by a human poking at it and going "huh, that's weird". "The agent said the tests pass" doesn't count.

- **Fix things you actually ran into.** Pointing an agent at the repo and asking it to find bugs gets you a pile of edge cases nobody hits, like a `NaN` rate limit or a timeout longer than 24 days. Fix the thing that broke your bot, one fix per PR.

- **Edit what the AI writes for you.** Issues, discussions, PR descriptions and replies can be AI-assisted, but read them and cut them down before you post. AI loves writing three paragraphs where one line would do. I'd rather read your one line, typos and all.

- **No AI-generated images, videos, audio, etc.** Text and code only, following the rest of these rules.

- **I'll close obvious slop.** If a PR or issue is clearly AI output you didn't read, I'll close it without a review. **Keep sending them and you'll get blocked from the repo.** If you're still learning, that's totally fine! Skip the AI, ask me stuff, and I'll help you out 😄

> Please don't open a PR just to become a contributor, either. Use seedcord, build a bot with it, and contribute when something gets in your way. That's the kind of contributor I'm after 😅

These rules are for outside contributions. Maintainers may use AI however they see fit, and everything still gets a human review before it goes in.

## There are humans here

seedcord is maintained by humans. Right now that mostly means me.

Every issue, discussion and PR gets read by a person (a couple of review bots read PRs too, but they don't make the calls). When you send AI output you didn't check, I end up doing the checking for you. That's pretty disrespectful imho. It's like handing someone an essay to proofread that you never read yourself.

In a perfect world, AI would get it right every time. It doesn't yet. How good the output is depends a lot on who's driving. Plenty of people driving right now don't check anything, and a lot of them couldn't check it properly if they tried.

## AI is welcome here

Seriously. seedcord is built with a ton of AI help, and the repo is set up so you can use it too.

For anything big, open an issue first and wait for me to reply. An agent can write a 2,000 line PR in an afternoon. I can't review one in an afternoon.

When you start on the code, point your agent at [`AGENTS.md`](AGENTS.md). It lists the skills from `.agents/skills` your agent should load, and those hold how this repo writes code, comments, tests and docs. With those loaded, your agent writes code that looks like the rest of seedcord, and my review goes a lot quicker. Even then, don't take its first try (or the next couple either tbh). Read it like you'd read someone else's PR, point at what's off, like "this is nested way too deep, use an `AsyncDisposableStack`", and have it redo it till you actually like what it wrote.

Before you push, run [`/branch-audit`](.claude/commands/branch-audit.md), or have your agent run it. It reviews your whole branch against `next` and catches a lot. Go through what it found yourself though, since _you're_ still the one deciding what's right.

Then read your whole diff once, top to bottom. Agents love leaving stray debug code, test scaffolding and random config changes behind. Clean those out before you open the PR.

All that to say, AI isn't the problem here. The problem is people who use it without understanding what it's doing, or without even trying to. That's how AI ends up with a bad rep. I just wanted to put this here to make it clear that it's fine to use AI for seedcord, and that I use it too.
