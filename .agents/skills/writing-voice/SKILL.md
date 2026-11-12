---
name: writing-voice
description: Use this when writing or reviewing any prose - docs, READMEs, code comments, commit messages, PR descriptions, changesets, and chat replies. Covers who does what in a sentence, plain words, one claim per sentence, negation, and the test that tells a good rewrite from a worse one.
---

# Writing Voice

Write the sentence you would say out loud to another developer at the keyboard. This covers everything a person reads: a comment, TSDoc, an error message, a changeset, a PR, a guide page, and a chat reply.

**Write the simplest sentence that says the fact.** Say it out loud the way you'd tell someone next to you, and write that version. Following the rules below cannot make a bad sentence good.

Vale checks the word bans, the punctuation, and every shape that a pattern can match. Its rules are in [`tooling/prose/vale/Seedcord/`](../../../tooling/prose/vale/Seedcord/), and each one gives a fix with the hit. The Claude Code hook shows the hits after each edit, and the pre-commit hook blocks the errors. This file covers what a pattern can't judge.

## 1. Who does what

Run these on each sentence, in order.

1. **Find who does the verb, and put them first with an active verb.** "The client refreshes the token when it expires." A sentence that hides the actor, like "the token is refreshed", leaves the reader to work out what acted and whether they have to do anything.
2. **Check that the actor can really do it.** Could you write that function? `throws()`, `reads()`, and `stores()` yes. `wants()`, `knows()`, and `lives()` no. Write the mechanism in place of the picture. A company like Discord or Cloudflare is people and servers, so it can act.
3. **Don't write a garden path sentence.** If the reader has to go back and read a sentence again, rewrite it. This usually happens when a clause splits two words that belong together. "A read before the host resolves it throws" splits a subject from its verb. "It throws if you read before the host resolves it" reads once.
4. **Ask who the instruction is for.** When the reader has to do the thing, write it to them: "To read them, annotate `ctx`". A generic subject with a present verb reads as something the code does on its own.
5. **Point every `it`, `this`, and `which` at the right noun.** The reader attaches it to the closest noun that fits. When that's the wrong one, repeat the right noun.

The passive is fine when the actor is obvious or doesn't matter, and the active version reads worse. "This page is generated from the TSDoc" beats "The docs build generates this page from the TSDoc".

## 2. Plain words

A compressed noun phrase is shorter than the plain sentence it replaces and costs the reader more. Cut whole ideas. Keep common words. Three tests for every phrase:

- **Would you say it out loud?** "The gradient toward variety is zero" fails. "Nothing pushes toward variety" passes.
- **Did you invent the noun?** Two abstract nouns that name an idea you had a minute ago are jargon. Say what happens, with a verb. "Performs a validation of the payload" is "validates the payload".
- **Did you borrow it as a picture?** A word from another field that stands for what you mean makes the reader unpack it. Write the thing itself. A real term of the domain, like debounce, shard, or snowflake, passes.

## 3. One claim per sentence

Write the claim and end the sentence. Add a second clause only when the reader would get the first one wrong without it. Then pick the connector for how the halves relate: `but` contrasts, `so` gives a result, `because` gives a reason, `if` sets a condition, `and` adds more of the same. When none of them fits, write two sentences. An instruction joined to its result by `and` reads as two facts: "Pass `true` and the getter throws". A result the reader wants takes `to`, as in "Pass `true` to make the getter throw". A mistake takes `if`.

Read the block as a whole. A person writes unevenly: some sentences end in four words, and one runs long because the thing was hard. Two sentences in a row with the same length and the same turn mean rewrite one.

## 4. Say what is

Write what the thing does or what's true, and give the condition in place of a selling point. "On a 429 the client waits `Retry-After` seconds" beats "retries without any manual wiring". Negation is normal English, so negate the verb: "doesn't write a log file". A sentence that repeats the one before it in reverse gets deleted.

## 5. The rewrite test

Compare every sentence to the simplest way to say the fact. Beating the old sentence isn't enough. A rewrite that's harder to read is wrong, even when it's shorter. A longer sentence that reads easier is better. Don't squeeze a sentence into a noun phrase to pass a rule, and don't stretch one into three clauses to get around a rule either.

Real rewrites from this repo:

<!-- vale off -->

<!--prettier-ignore-start-->

| Written | Rewritten |
| --- | --- |
| Tag a fragment that can't compile alone `plain`. | Tag a fragment with `plain` if it can't compile by itself. |
| Your checkout stays as it was, because the versioning runs in a temporary copy of `HEAD`. | It versions a temporary copy of `HEAD`, so it doesn't mess with your checkout. |
| An unlisted post builds at its url but stays out of the blog list. | An unlisted post gets a page at its url, but the blog list doesn't show it. |
| Anything the bot keeps in memory lives in one isolate, and two isolates keep separate records. | Each isolate has its own memory, so two isolates don't share records. |
| the config type of a bot with no wrangler config beside it | the config type for a bot without a wrangler config |
| Going global meant clearing `TESTING_GUILD_IDS`. | In production, leave out the guild IDs. |
| two classes and a helper they share | two classes and a shared helper |
| where the counts live | where the counts are stored |

<!--prettier-ignore-end-->

<!-- vale on -->

## 6. Chat

A reply in chat follows every rule above. Two or more named things go in a list. Acknowledge in as few words as you can, then give the content.

## The test

Read what you wrote once at speed. Rewrite every sentence where you stopped and started over.

Can a reader predict the exact behavior from the sentence, or do they only get an impression that something was said? If it's an impression, rewrite it as a fact, a step, or a failure. If a word makes the reader stop and work out what it means, replace it with the plain thing.
