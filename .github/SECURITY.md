# Security policy

## Reporting a vulnerability

Report it privately through [GitHub's advisory form](https://github.com/seedcord/seedcord/security/advisories/new). We can talk it through, fix it in a private fork, and publish the advisory from the same thread.

If you can't use GitHub, email <materwelonDhruv@gmail.com> or message `@materwelon` on Discord.

Keep it out of public issues, pull requests, and the Discord server until a fix is out. I aim to reply within a week.

Tell me:

- which package and version you found it in
- how to trigger it, with a proof of concept if you have one
- what someone could do with it

## What counts

A way for someone outside a bot to make seedcord do something the bot's author did not allow. For example:

- an interaction whose signature fails verification still reaches a handler on the http transport
- a crafted custom id reaches a handler or a value that its route should reject
- the bot token or an environment value ends up in a log, a reply, or an error report

## What does not count

- A bot misconfigured by its own author, such as a token committed to a repository
- Anything that needs access to the machine the bot already runs on
- Rate limits that Discord itself enforces
- A vulnerability in discord.js or another dependency. Report it upstream, then tell me if seedcord makes it worse

## Supported versions

seedcord is pre-1.0. A fix ships in the next release. I only patch an older version when the problem is severe.

## After the fix

I publish the advisory once the fixed version is on npm, and I credit you in it unless you'd rather stay unnamed.
