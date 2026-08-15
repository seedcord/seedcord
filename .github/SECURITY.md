# Security policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Email <materwelonDhruv@gmail.com>, or message `@materwelon` on Discord. I aim to reply within a week.

Tell me what you found, how to trigger it, and what someone could do with it. Include a proof of concept if you have one.

## What does not count

- A bot misconfigured by its own author, such as a token committed to a repository
- Anything needing access to the machine the bot already runs on
- Rate limits Discord itself imposes
- A vulnerability in discord.js or another dependency. Report those upstream, then tell me if seedcord's use of it increases the impact

## Versions

seedcord is pre-1.0. I ship fixes on the latest release, but I might patch an older version when the problem is severe enough.
