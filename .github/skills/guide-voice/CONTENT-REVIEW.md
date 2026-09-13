# The content review

One Sonnet agent, one page. It reads the page plus the declarations the page teaches from, and it opens source files. The prose half runs as a separate agent against [`PROSE-REVIEW.md`](./PROSE-REVIEW.md), and the two run in parallel.

The split is deliberate. This half has to open source to do its job. The prose half never should, because a page's own text is what it is judging.

**Send the prompt verbatim.** Fill in four per-page fields and change nothing else: the file path, the symbols the page teaches, which sibling pages cover which material, and which of the five architectural arguments this page is responsible for. Adding the verdict you already reached turns the answer into your own opinion read back to you.

Section 1 of the skill lists the five arguments. Which page is responsible for each one is a content decision rather than a rule, so you fill that field in when you send the prompt.

---

```txt
You are checking one page of a documentation guide against the code it
documents, before the author reads it.

You are not reviewing the writing. A separate agent does that. Your job is
whether the page is true, whether it is complete, and whether it explains the
design decision it asks the reader to adopt.

Read: <path to the .mdx file>

The page teaches these symbols: <list them>
These sibling pages own this material, so it is out of scope here: <list them>

Read this file before you judge anything:

    .github/skills/guide-voice/SKILL.md

Use the codebase-memory MCP for structure, then open every declaration yourself
and read it whole. Never assert a claim about the code you have not opened. Give
a file and line for every finding.

Eight checks.

1. The argument this page is responsible for.

   This page is responsible for the argument about: <name it, or write "none">

   If it has one, report whether the page carries it and where. An argument has
   four beats: the rule, the mechanical reason, the consequence, and the cost or
   exception disclosed on the spot. Report which beats are missing.

   The reader meets these decisions in the first code sample they ever see, so a
   page that shows the shape and never argues for it leaves them following
   instructions on faith. Report the paragraph that should exist and what it has
   to say, sourced from the code.

   Where the field above says none, say so in one line and move on.

2. Every feature's reason to exist.

   Take each section of the page and read its opening. A section that teaches a
   feature says what the reader does without it and what that costs them, in one
   or two sentences, before it says how to configure the thing.

   A real miss. The emoji section opened on "Name each custom emoji in your
   config, then read it back by that name", where the fact the reader needed is
   that Discord takes a custom emoji as <:name:id>, so without the map those ids
   spread through the message code and go stale on a re-upload.

   For each section report whether it answers this, and where it does not, write
   the answer yourself from the declarations and from what the platform
   requires. Name the file and line, or name the platform rule. Report the ones
   you cannot source rather than reasoning one out.

3. Every claim about behavior, checked against the source.

   Read every sentence stating what the code does. Open the declaration and
   confirm it. Report every claim that is wrong, and every claim that is true of
   one class and stated as though it covers a family.

   A real example of the second kind. A page said "Reading .component applies
   your bot color" beside an example using RowComponent, where that getter
   returns the builder and leaves the color alone.

4. Every way of using the surface.

   Open the declaration of each symbol the page teaches and read the variadic
   parameters, the overloads, the optional arguments, and the bounds on every
   generic. Each distinct form is a separate way to use the surface and each one
   belongs on the page once. A decorator declared (...names: Names[]) where
   every fence passes a single name is this finding. So is a generic accepting a
   union where every fence passes one member.

   Report the form that is missing and name the file and line of the declaration
   that offers it.

5. Optional markers.

   Report every parameter or field the page states flatly where the declaration
   marks it optional, gives it a default, or makes the whole options argument
   optional. A parameter read as required costs the reader an argument they
   never needed. A field read as always present costs them a guard they skipped
   on something that can be absent. The reverse counts too, prose calling
   optional something the declaration requires.

   Report the sentence and the declaration's file and line.

6. Transport differences.

   This framework ships two transports as two packages. For each symbol the page
   teaches, open its declaration in packages/gateway/src and in packages/http/src
   and compare. A symbol declared in one package only, or declared in both with
   different types, is a transport difference and needs a
   <Callout type="transport"> naming both types by name.

   Check each member separately. One callout covering a class does not cover a
   second member on it that differs on its own.

   The resolved option getters are the densest cluster. Each transport package
   declares one lens interface mapping the same member names to that transport's
   leaf types, and the two sit in the matching src/inputs path in each package.
   Find both, then compare them member by member.

   Where nothing on the page differs, say that in one line.

7. Internal surface.

   Report any symbol the page names that is reachable only through the package's
   ./internal entry. Read the exports map in the package's package.json to tell.
   That split exists because JavaScript does not have package-private, which
   makes it a packaging detail. Name the public surface that replaces it.

8. The page mechanics.

   Section 7 of the skill lists the conventions a page follows. A page that
   breaks one still renders, so nothing else catches them. Walk that list
   against this page and report every miss with the line.

   Several need a file open, which is why they are here rather than in the prose
   review. The ref: link targets, the import-line cut convention, the fence type
   against what the paragraph is about, the twoslash ceiling, a config key
   without a real constructor sample around it, a raw discord.js builder where
   BuilderComponent belongs, and prose naming code that a cut hides.

   Check the completion marker by name. `^?` answers "what type is this" and
   `^|` draws the list an editor would offer at that point. Report every place
   the paragraph's real question is "what can I type here" and the page answers
   it by writing the names out in prose, since the marker replaces that
   sentence. The typed-registry surfaces are where this lands: a route
   decorator's first argument, an option getter's key, dispatch require() and
   get() against the keys a bot declared, an emoji lookup against EmojiMap, and
   a custom-id field name. A `^|` fence needs `// @noErrors`, since the sample
   is a partial expression by construction. Name the fence and the line.

Two rules on how you answer.

Never invent a reason. Where the code shows a decision and no record explains
it, report that the argument is missing and say what the code does. Do not
supply a rationale you reasoned out yourself and present it as the project's.

Report a negative plainly. Where a check found nothing, say so in one line
rather than omitting it, so the author knows it ran.

Return only a list. For each finding give the check number, the sentence or the
gap, the file and line of the declaration that settles it, and the repair.
```
