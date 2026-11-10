---
name: guide-voice
description: Use this when writing or reviewing a page of the seedcord guide, anything under apps/guide/content. Covers when a page explains why, how it talks to the reader, the sentence rhythm it needs, the mechanics every page follows, and the two review passes a page runs before anyone reads it.
---

# Guide voice

A guide page teaches. Someone reads it on purpose to get a bot working, and they can leave at any point. They need two things from every page: what to type, and why it's shaped that way.

[`writing-voice`](../writing-voice/SKILL.md) applies here in full, and so do the Vale rules it points to. This file adds what's different on a guide page.

**One claim per sentence changes here.** On a comment or a changeset, cutting at the connective is right. On a guide page it deletes the reason, because a reason attaches at a connective. "This rule exists because pointer methods can modify the receiver" loses half its meaning when you cut it.

**Everything is in present tense, complaints included.** Past tense reads as seedcord's history, as in "Finding the answer meant opening the guide". Write release history like "the old build only compiled TypeScript" in a changeset, since a reader who starts today never had the old behavior.

---

## 1. When a page explains why

Three sizes of why, each in a different place.

**Put a reason built on a mechanism next to the thing it explains,** in one or two sentences. Most reasons are this size.

> Every button carries its target page inside the custom id, so a click still works after your bot restarts.

**State what a feature is for when its heading doesn't already make that clear.** Write one or two plain sentences that state the problem as a fact, using the words a reader would search for. Open with a frame word, so the reader can tell that this page fixes it: `by hand`, `yourself`, `Without`, `With plain discord.js`, or an `if`.

> With plain discord.js, `getString('query')` hands back `string | null`, and every read opens with a check.

After a frame, use `would` for what the reader does without seedcord: "By hand, you'd copy each emoji id into a constants file and keep it in sync yourself." Flat present there, like "you copy each id", reads as an instruction to go do it. Keep the present for a fact that's still true, like what discord.js returns.

Then answer it in the next sentence, and repeat the noun so the reader can follow the join: "Every option you declare becomes a getter on `this.options`."

Don't write a scene. An invented person, a made-up afternoon, "you've hunted for X before", or a story about what breaks six months out all make the reader work through a picture to reach the fact. State the fact.

Rules for the problem sentence:

- **Ground it** in the guide or the code. The problem has to be one this feature solves, sourced from its declarations. A problem remembered from another library or made up to fit the feature is wrong, even when it sounds plausible. An opener once claimed plain discord.js splits a command across two files, and discord.js's own guide puts both in one.
- **Write the problem as what it costs.** "You can declare those types by hand, though you'd update them on every rename" offers the reader a choice and tucks the cost behind `though`. "Without codegen, you'd declare those types by hand and update them each time you rename a key" states the cost.
- **Give the verb to whoever acts.** "A second reply comes back rejected" reads as seedcord rejecting it. Discord rejects it, so write that.
- **Use `would` only after a frame.** Without one, "You'd write your own wording onto that card" reads as advice. "The wording on that card is yours to replace" states what's true.
- **Leave a limit unframed when the reader still lives with it.** Discord still allows three seconds and still sends a click back as one string. A frame there promises a fix that nobody ships.

**Argue for the framework's shape on the page that teaches the thing,** near the top. Five exist, one for each thing seedcord asks a reader to do that needs defending:

1. Write classes with decorators, and write the route twice.
2. Subclass a base for a component.
3. Run a codegen step.
4. Send every reply and every refusal through one boundary.
5. Pick one of two transports.

Each one gets argued once, on its page. Whoever sends the content review fills in which argument the page carries.

### The shape of an argument

Four parts, in any order: the rule, the mechanical reason, the consequence, and the cost or exception, stated in the same place. The codegen page:

> An option's name and its required flag are arguments to method calls. Those calls run when something constructs the class. TypeScript reads the source of that chain without running it, so the name `query` only exists once the chain has run.
>
> `seedcord codegen` records those names for you. It imports every `.ts` and `.js` file under your commands folder, constructs each decorated class it finds, reads the JSON that class's builder produced, and writes what it found to `seedcord-gen.ts`.
>
> The cost is a generated file you commit.

Ground each part in the code before you write it. "Codegen reads those files" reads as static parsing, and it's wrong, since codegen imports and runs them.

**A forced decision and a chosen one argue differently.** Codegen is forced: TypeScript can't evaluate a builder call, so the page shows the limit, the tool that gets past it, and the cost. Subclassing a component base is a choice, because nothing stops a reader building a `ContainerBuilder` inline. A page about a choice says:

1. where the reader is right now, with the code they already write
2. the decision they're making
3. what the choice does to their code, carried to the payoff: "To reword the card, you change one line in `BanCard.ts`, and every handler that sends one gets the new wording"
4. what it costs
5. when to skip it

A list of the design's good properties skips all five and reads as marketing.

**Say which alternative lost, when one was weighed.** The route is written twice, in the decorator and the generic. A form that writes it once was built and declined, because a call in an `extends` clause reads as mixin machinery and go-to-definition opens a generated base. Where nobody weighed an alternative, give the reason and stop.

**Teach the judgment that comes with a surface, where it has one.** Once a reader has a surface, they face a call: which file the code belongs in, which of two shapes fits, what today's choice costs later. Write it only when a reader who skipped it would regret it in a way specific to this surface, and you can give the cost with a mechanism behind it. One paragraph at most.

> Keep that declaration in the file with the component that encodes it. Both sides read the field names off one `CustomId`, so a rename can't reach one and miss the other.

### Read the sample

After a fence, point at something in it: a value, a line, a token. "TypeScript reads the source of that chain without running it, so the name `query` only exists once the chain has run" works because `query` is in the fence above it.

Test: could the paragraph sit under a different sample without changing a word? Then it's written beside the code, and it needs to point into it.

Put the sentence saying what the code does right after the fence. Before the fence, keep only the rule or the question that the sample answers. A hand-written version shown next to a sample carries the same fields, so the comparison shows the real cost.

### Set up the problem with a small case

A short setup made of real names gives the reader something concrete to hold while the mechanism arrives. Open it with words that mark it as an example, like `Say`, `Suppose`, or `Let's assume`, keep it in present tense, and solve that exact case in the section:

> Suppose three handlers respond to `messageCreate`, and none of them should answer a muted member. Each handler repeats the same mute lookup. If you add a fourth handler and forget the lookup, it answers anyway.

It works best when the rule depends on order or covers several cases, like "Say a command costs one credit. Your gate deducts one, then a later gate refuses. The command never runs, but the caller still loses a credit."

A setup is different from a scene. A scene narrates the reader's own past, like "You've hunted for an emoji id before", so the reader has to read through it to reach the fact. A setup builds a case out of code that the reader is about to write. Vary the opener across the pages in one tab, since every setup on a tab opening with `Say` reads like a template.

---

## 2. Talking to the reader

- **Contractions:** use them, like `doesn't`, `you'll`, and `it's`. A reader who scans past a `not` can't misread `don't`. Skip the odd ones like `mightn't've`.
- **`you`** is the subject for anything the reader does. A page that teaches a hard idea and never says `you` is the failure. A reference table runs lower, and that's fine.
- **`we`** means the reader and the guide together: "In the next section we'll add a gate." **`I`** appears only in the Start tab's Philosophy section.
- **A question heading** is fine when the section answers that question. A heading that picks for the reader, like `Pick gateway if...`, is banned. `How to pick` covers both.
- **Warmth** belongs at a seam (a page opening, a line under a heading, a page ending) and next to a failure the reader is about to hit, in a few words. "Try the code in Listing 4-6. Spoiler alert: It doesn't work!" is the shape. Leave it off a reference table and off a policy page.
- **No jokes, winks, or exclamation marks,** and no sentence that performs enthusiasm. A reader who learned English second misses most humour. A plain complaint about a real annoyance reaches them.

---

## 3. Rhythm

**`because` for a reason, `so` for a consequence.** "Codegen writes the declarations, so a typo in an option name stops the build" is a consequence. "The route is written twice because the decorator and the generic are separate declarations" is a reason. The guide leans on `so` far more than `because`, so check each one.

**Aim for a spread on every page:**

- at least one sentence past 22 words, where the thing is hard
- several under 8
- no run of three in a row under 8
- at most one one-word sentence

**When you cut a connector, vary the repair:** fold one clause into the other, open the second half with `because`, use a relative clause, or end the sentence. Cutting every `, so` to a period leaves a page of stubs. Read the paragraph after each fix.

**Put a condition first.** "`ArraySource` opens the last page for a number past the end" makes the reader meet the result before learning when it happens. "If the number is higher than the last page, `ArraySource` opens the last page" reads once. Swap a position word like above, inside, or nested for what the code does, using the names in the sample.

**`where` points at a place.** For a condition, write `if` or `when`.

---

## 4. One word, one job

A word means one thing across the whole guide. `verb` meant a reply method on one tab and a store operation on another, so a reader who met both learned neither. `card` fits the messages seedcord builds for you, since `NoticeCard` is a container. For the reader's own components, write the name of what the code builds, or `component`.

Define a term the first time a reader can reach it in tab order, which comes from the tab's `meta.json`. When no page makes a good home for the definition, stop using the word.

A count or a correction tells you where to look, and you still judge each instance. "Instead, handle both in a single handler class" is right where the sentence above described the two classes, even though a sweep for `instead` caught it. Repeated words get the same check: when two sentences do different jobs, both can keep the words. When they do the same job, cut the weaker sentence whole.

---

## 5. The loop

Run these one at a time, and fix each pass's findings before the next one, since every fix is a sentence nothing has checked yet.

1. Answer the questions in section 6.
2. Read the kit page, `apps/guide/content/dev/mdx-kit.mdx`. It holds every element a page can use.
3. Write the whole page in one pass.
4. Read `writing-voice` and this file, then fix every line they flag. The hook shows Vale's hits after each edit.
5. Read the page whole, out loud, as someone who has never seen it. Would a person explaining this sound like this? Would a reader who learned English second get through without re-reading? Check the spread from section 3.
6. Run both reviews in parallel, one Sonnet agent each, with [`PROSE-REVIEW.md`](./PROSE-REVIEW.md) and [`CONTENT-REVIEW.md`](./CONTENT-REVIEW.md). One pair can take up to four pages.
7. Fix what they find, then run step 5 again.

---

## 6. Answer these before writing

- **Who reads this page?** Someone who has built a Discord bot or is about to. They know JavaScript and Discord, and may know nothing about seedcord.
- **What do they already know?** Leave out anything you'd have to teach them to make a sentence clear, unless the page is about that thing.
- **What's the one thing they need from this page?** Cut whatever doesn't serve it.
- **Does each feature's heading say what it's for?** Where it doesn't, the problem sentence from section 1 opens that section.
- **What call does this surface hand them?** Where there's a real one, write a paragraph about it. Where there's none, write nothing.
- **What are all the ways to use it?** Open the declaration of every symbol the page teaches and read it whole. A variadic parameter, an overload, a generic that takes a union, and an optional argument are each a separate way to use the surface.

---

## 7. Mechanics every page follows

The content review checks this section as a list. A page that breaks one of these still renders, which is why nothing else catches them.

- **The frontmatter `description` says what the reader does with the feature, in one sentence of 100 to 160 characters.** It becomes the meta description, the link preview, the lede under the page title, and the first line of the page's Markdown copy, so the reader deciding whether to open the page reads it with nothing else. Someone who has never heard of seedcord should get the gist from it alone. Lead with the task in the reader's words, and add the one detail that no neighbouring page shares. "Upload files with a reply and show them in the message through a file, thumbnail, or media gallery component" tells someone in a search result that this is their page. The page's sharpest fact belongs in the body. "Discord hides an upload that no component references" is a fact the files page proves. Leave out a list of what the page covers, since the table of contents already shows the headings and Google cuts a snippet at about 155 characters. The "from X to Y and Z" shape is that list in disguise, so rewrite it around the task. Keep a colon followed by a space out of it, since the value is unquoted YAML. Backticks don't render in a description, so write a function name as `or()` to keep it from reading as the English word.

    Keep the description as wide as the page. A rewrite aimed at one reader's question can shrink the claim to that question. The combining page's description became "Let either the owner or a moderator run a command with or()", which reads as if gates only check roles. Put the reader's case in as an example beside the general claim, marked with `like`: "to let a command run when any one passes, like the owner or a moderator, or to group checks you reuse".

- **Headings and openers use the words a reader types into search.** The guide's search matches meaning. It still misses a page whose words never meet the reader's. Someone asking how to stop people spamming a command found nothing until the cooldown page said "spam". Put the reader's word beside the precise term, so a reader who already knows the term still finds the page. It never narrows what the sentence covers. Adding "spam" to a sentence about limiting uses keeps the sentence true for every caller. Rewriting a heading or a description around one search question makes it cover only that question, which is the narrowing the description rule above warns about.
- **Renaming a heading changes its anchor.** Search the guide for links to the old anchor and update them in the same change.
- **A seedcord symbol mentioned in prose gets a `ref:` link on its first mention.** `[BuilderComponent](ref:core/BuilderComponent)`, package segment then symbol. A fence tagged `hovers` already links its own tokens. A table links every symbol in it again, since a reader can arrive at one row without the paragraph that held the first link.
- **Emphasis earns its place per word.** Italic stresses a word a reader would misread without it, as in "Routing reads the prefix _alone_". Bold marks a Discord UI label, like **Confirm**, or a list label. Most paragraphs don't need any.
- **The import line shows on the first fence and gets cut on the rest**, with `// ---cut---` under it. A later fence keeps its imports when its symbols are new to the page. Start-tab pages keep imports on every fence. Prose around a fence can only name what the fence still shows, since a cut hides those lines from everyone except the writer.
- **A fence states how it shows types.** `^?` when the prose is about one or two of them. `hovers` when the reader has a shape worth exploring, at roughly five times the bytes and build time. `^|` when the reader's question is what they can type here. A bare `twoslash` with no marker when the sample only needs checking, which is most samples. Tag a fragment with `plain` if it can't compile by itself. The page fails to compile if a `ts` fence has neither tag.
- **Prose describes what the rendered page shows.** twoslash strips its markers (`^?`, `^|`, `// @errors`, `// ---cut---`) before the page renders, so a sentence pointing at one points at nothing. Point at what the reader sees, like the type under a line or the list of completions.
- **Ten twoslash blocks per page is the ceiling.** Past that `next dev` has run out of memory at 8 GB. A page needing more than ten compiled samples is usually two pages.
- **One `^|` per fence.** Two markers in one sample break it, since a line ending in a dangling dot swallows the line below into that member access and the second marker then resolves against nothing. Two questions want two fences. A failed marker throws at render and takes the whole page to a 500, so check any page carrying one in the browser before you move on. For an object key with nothing typed yet, end the line on a quote, as in `this.match({ '`. twoslash hands TypeScript the character before the caret as a trigger character, and `{` throws "Illegal value" while a space returns nothing.
- **Read the rendered list before writing the sentence above a `^|` fence.** The list holds what the type offers, which is often narrower than the prose assumes. `Commands.` offered the routes that are valid identifiers and left the slashed ones out, so a lead-in claiming it listed every route was false against the fence directly under it. Confirming the marker rendered is a separate question from confirming the sentence matches it.
- **A cut that hides trailing lines takes `---cut-after---`, and a fence carrying `@errors` doesn't take a trailing cut at all.** `---cut---` alone leaves the closing braces on screen with nothing above them, closing a block the reader cannot see. `---cut-after---` fixes that on a `@noErrors` fence. On an `@errors` fence any cut after the error removes the annotation while the page still returns 200, so show the whole enclosing class and cut only the import, since cutting before the error is safe. After touching one of these, count `twoslash-error-line` in the rendered html, two per error. A line count misses a missing annotation.
- **A config key appears inside a real `new Seedcord({ ... })` sample**, on the page that teaches its subject, with any note as a `//` comment on the line.
- **A sample reads like shipped code.** Oxfmt prints a fence at 68 columns, so work done inline in a callback buries the lesson under four levels of indent. Pull it into a private method.
- **A sample builds components through `BuilderComponent`**, never a raw discord.js builder inline. A page teaching the framework while using the thing the framework replaces teaches the anti-pattern.
- **A symbol whose type differs between the two transport packages takes a `<Callout type="transport">` that gives both types.** Check each member separately, since one callout over a class does not cover a second member that differs on its own.
- **No page mentions an `./internal` entry**, or a symbol reachable only through one. Read the `exports` map in the package's `package.json` to tell. Point to the public surface and stop.
- **Keep inline code short.** Backticks do not wrap, so a full error message or a chained expression pushes past the column on a narrow screen. Use quotes, a fence, or a table cell.
- **A trap uses the exact error string as its heading**, so a pasted error hits an anchor. When two related errors share causes, like the global and the guild command deploy refusals, put what they share in one paragraph above both headings. Each heading then holds what differs for that error, in whole sentences that make sense when someone arrives at that anchor from a search.
- **A claim about Discord links Discord's docs, or comes off the page.** A limit, a threshold, or how the client behaves is Discord's to state. The content review can check a claim against seedcord's code, and nothing in the repo proves a claim about Discord, so an old page's line about Discord gets checked against Discord's docs before a rewrite keeps it.
- **A section that narrows the one above it takes an H3.** One option inside "Adding options" nests under that H2, so the table of contents shows which section it belongs to.
- **A callout takes whole blocks, including a fence.** Use the blank-line form: `<Callout type="warning">`, a blank line, the blocks, a blank line, the close.
- **A callout's type matches what it holds.** A warning holds a trap the reader will hit and break on, so a trap like that always gets a warning callout. A tip holds something optional, and a note holds context. Keep a one-line fact with nothing to act on in prose. When most sections carry a callout, none of them stand out, so keep the ones a reader would regret skipping.
- **A page outside the Start tab works for a reader who hasn't read the pages before it.** Someone opens it cold from search or the sidebar, so it says what it needs and links the rest. The Start tab is an ordered path and its pages do build on each other, which is how the core page opens on the ping handler two pages earlier.
- **No page's code sample depends on a prior page**, wherever the page sits.
