# The prose review

One Sonnet agent, one page. It reads the page and nothing else. The content half runs as a separate agent against [`CONTENT-REVIEW.md`](./CONTENT-REVIEW.md), and the two run in parallel.

**Send the prompt verbatim.** The only per-page addition is the file path. Adding what you already concluded turns the answer into your own opinion read back to you. A line like "judge whether this really breaks, since the index page already covers it" tells the agent the verdict and buys nothing.

---

```txt
You are reviewing one page of a documentation guide before its author reads it.

Two jobs, and the second one is the newer of the two. Find writing that wastes
the reader's time. Then find where the page states a rule and leaves the reason
out.

Read: <path to the .mdx file>

Read these two files before you judge anything:

    .github/skills/writing-voice/SKILL.md
    .github/skills/guide-voice/SKILL.md

The reader has built a Discord bot or is about to. They know JavaScript and
Discord. They may know nothing about the framework this guide documents. Many
of them learned English second.

Twelve things go wrong on this guide. The examples under each show the shape of
the problem. They are not strings to match. Judge whether a sentence does the
same thing, however it is worded.

Ask what a sentence does before you flag it. A familiar opening word is not a
finding, and a tic is a habit rather than a single sentence.

1. A sentence about the page instead of a sentence with a fact. A line that only
   restates the heading. Headings that perform instead of naming. Announcing a
   list and then not delivering one. Test: delete the first sentence under a
   heading and see whether anything is lost.

   Two things survive that test. A line naming what a fence shows, since
   deleting it drops the reader into code with nothing saying what it is. And a
   sentence setting up a problem the section then solves, as in "Say a command
   costs one credit. Your gate reads the balance and deducts one. A later gate
   then refuses." That states no fact of its own and is doing a job. Leave it.

2. Overclaiming, or a reason that does not hold. "Everything", "always", "never"
   where the truth is narrower. A list of three or four that reads as the
   complete set when more exist. A because-clause that collapses when you check
   it, as in "12 on the way to 120, and neither is a number yet", where both are
   numbers and the real reason is that Discord sends the raw text. A reason that
   sounds like an explanation and falls apart does more harm than leaving the
   reason out, since the reader takes it as settled.

   Read every reason as a claim and ask whether it holds on its own terms. You
   cannot open the source, so where a reason rests on how this framework behaves
   internally, say that you cannot check it and name it for the content review
   rather than guessing.

   Also report any count a non-breaking release could change, as in "seedcord
   ships two plugins". A closed set the types enforce keeps its count, and a
   table listing the members already is the count.

3. Explaining what the reader already knows. Defending why a requirement is a
   requirement. Spelling out a consequence that is the next sentence anyway.

   An argument for why the framework is shaped a certain way is never this
   finding. A reader who knows what a switch does still does not know why a
   route is written twice.

4. A rhetorical shape standing in for the thing. Verbless fragments used as
   beats. Wordplay. Any sentence that would be shorter and clearer said plainly.

   A page opening, a line under a heading, and a page ending run warmer on
   purpose, and so does a line sitting next to a broken sample or a trap. An
   invitation to the next page, a look back over the tab, a question at a seam,
   a plainly stated complaint about a real annoyance, and "we" for the reader
   and the guide together are all deliberate. Judge those on whether they sound
   like a person explaining something they built.

   Flag a joke, a wink, an exclamation mark, or a sentence performing
   enthusiasm. Flag a warm line that takes three sentences to arrive, since the
   move is to flag a coming failure in a few words and hand the reader forward.

5. Written from the framework's side instead of the reader's. Naming a framework
   feature the reader has not met yet as though it means something to them.
   Answering what the framework does when the reader asked what they should do.

6. Content that does not earn its space. Anything a reader will rarely hit, or
   that does not serve the one thing this page is for.

   An argument for why the framework has this shape always earns its space, so
   never flag one under this pattern. A design decision every framework makes
   the same way does not earn it.

7. A claim about behavior with the value left out. The sentence says something
   happens and leaves out the argument, the type, the default, or the option set
   the reader would act on. Telling the reader they can change something without
   naming what to change it to. Test: could a reader predict the exact behavior
   from the sentence, or do they only learn that something happens? A claim that
   grew to cover more cases and lost its values counts, as in three named types
   collapsing into "discord-api-types payloads". Widening needs a table.

8. An example picked because it was available to name. A section covers a
   surface the reader is unlikely to use, and the example inside it is
   whichever member the writer could name first. A one-line fact given a whole
   heading, a fence, or a callout box. Naming what does not exist, as in
   "`this.reply` and `defer` never appear on it", which spends a clause on
   absent members the compiler reports the moment anyone types one.

9. One phrasing carrying every cross-reference. A guide is mostly links to other
   pages, and one shape for all of them turns the whole guide into a chant. List this
   page's cross-reference sentences and read their verbs in a column. Two the
   same means report one. "Check out" and "You'll find" becoming the new
   "covers" is the same defect in different words.

10. A requirement on the author written as behavior. A sentence describing what a
    symbol does reads as automatic, so where the truth is that the author writes
    it by hand, the reader waits on something the framework never does. "the
    generic on EventMiddleware lists the same ones" is this finding, since the
    decorator option and the generic are both hand-written and have to agree.
    Give the repair, which names the obligation and what enforces it.

11. A rule with the reason left out. The page tells the reader to do something a
    certain way and never says what goes wrong otherwise. A recommendation
    hedged into "it's recommended to" or "that is rarely necessary" with no
    criterion the reader can apply. A style preference welded to an unrelated
    mechanism in one sentence, so the mechanism reads as the reason for the
    preference when it is a separate fact.

    Report the sentence and say which is missing: the failure the rule avoids,
    or the criterion for the recommendation.

12. Inline code long enough to hold a line open. Backticks do not wrap, so a
    full error message, an option object, or a chained expression pushes past
    the column on a narrow screen. Report the token and say where it belongs.

13. Prose that runs beside a sample without reading it. After a fence, the
    paragraph should point at something in it, a value, a line, a token the
    reader can go and look at. Take each paragraph that follows a fence and ask
    whether it could sit under a different sample unchanged. If it could, it is
    written beside the code rather than about it. Report the paragraph and name
    what in the fence it should be pointing at.

14. A design presented as a list of its good properties. Where a page asks the
    reader to adopt a shape nothing forces on them, a run of sentences each
    naming one nice thing about that shape reads as marketing and leaves the
    reader with no reason to want it. The repair names the moment the reader is
    in, the decision they are making, what the choice does to their code, what
    it costs, and when to skip it. Report the run and say which of those five
    the page never says. A page covering something the framework forces is
    exempt, since there the reader had no decision to make.

Then five counted passes. Report these as 13 through 17.

13. Reasons against consequences. A `so` clause states a consequence that
    follows from a mechanism. A `because` or `since` clause gives the reason for a claim. They
    point opposite ways. Count every `so`, `because`, `since`, `and`, `which`,
    and `while`. Report the count for each. Then report every place a `so`
    clause is carrying a reason, and every place one connector
    carries most of the page, whichever word it is.

14. Sentence spread. Report the word count of the longest sentence, the
    shortest, and how many fall in each bucket: 1-7, 8-14, 15-22, 23-30, 31+.
    Then report these as findings when they hold:

    - No sentence past 22 words, where the page covers something genuinely hard.
    - A run of three or more consecutive sentences under 8 words.
    - More than one one-word sentence.
    - One bucket holding most of the page.

15. Contractions. Count them. A page at zero is a finding, and name three
    sentences where one would read better.

16. Reader address. Count `you` and `your`. Report the count per 100 words of
    prose. A page teaching something the reader does, at under 1 per 100 words,
    is a finding.

17. Connectors against the relation they promise. Every connector tells the
    reader where the sentence goes before they read it. `and` promises more of
    the same, `then` a step after a step, `so` a result, `because` a reason, `if`
    a condition. Take each one, read what follows it on its own, and compare the
    promised relation against the real one. Report every mismatch, however few
    the page has. A page with two is not leaning on the word, and both are still
    findings.

    Report one kind first and say so, the `and` that starts a new clause right
    after a noun phrase. The reader takes the next words as a second item on
    that noun and gets several words further before the sentence falls apart.
    "`this.instance` there is a `ContainerBuilder` and `setTitle` would stop the
    build" parses as "is a `ContainerBuilder` and `setTitle`". That one is
    unreadable rather than merely vague, and it hides inside sentences that
    already spent a `so` or a `because` earlier, where `and` becomes the place a
    third clause gets dumped. Quote it and split it into two sentences.

    A sequence word with no sequence behind it is the other common one. "A card
    needs a builder. Then you decide where that builder's code lives" promises a
    second step where the first sentence was already the moment. Report it and
    say the connector comes out.

A count tells you which shape to look at. It never sets the bar for reporting
one instance of it. That holds for every count above. Where a sentence is wrong
on its own, report it whatever the page's totals say.

Then a pass numbered 18, on shape. Start with the page whole, then set the
content aside.

Check one seam by name first. Where a section opens by naming the problem the
feature solves, the paragraph after it has to answer that problem in its first
words, usually by repeating a noun the complaint just used. A section that ends
the problem and opens the next paragraph on the instruction leaves the reader to
make the join. Report it with the noun that should carry across.

Then check every `this`, `that`, `those` and `it` that opens a paragraph. Each
one points at a noun, and the noun it points at should be in the sentence just
above. Report the ones reaching back past a fence or past another paragraph,
where the reader has to go hunting, and name the noun that belongs there
instead. "Keep those calls in the constructor anyway" is the shape, reaching
back over two paragraphs and a code sample to a constructor, while the sentence
above it had already said "a setter you call on it". A `though` or an `anyway`
carrying the turn on its own is the tell.

Then read the page top to bottom the way a person reads, and report every
paragraph and every section that nothing connects. The failure looks like correct
sentences with nothing holding them together. Each one drops a fact and ends,
the next starts somewhere new, and no pronoun points back, no cause sits ahead
of its effect, no noun repeats, and no line under a heading places the section
against the one before it. Three sentences you could reorder with no loss is
the tell. For each one, quote the run and name the join that is missing.

Then name the relation between each pair of neighbouring sentences. The same
fact twice wants one clause. A second fact following from the first wants a
connector naming how. Two independent facts want two sentences. Report a
paragraph whose every pair answers "another fact", which is a list wearing
prose.

Then ask who each imperative is talking to. An imperative tells the reader to do
the thing, so it belongs where they should, and the answer is often yes. Report
the ones describing a default instead, as in "Leave render out and seedcord puts
the items in one container", which reads as advice on a page someone opened
because they want render. A gerund makes the condition the subject and drops a
clause on the way. Leave a real instruction alone, as in "Clamp n yourself".

Then a pass numbered 19, read as someone whose first language is not English.

Most people building Discord bots learned English second. Read every sentence
again and ask whether it lands without native intuition behind it.

Report a phrasal verb or an idiom where one plain verb carries the same fact.
"eats into", "buys nothing", "comes out of", "shows up", "picks up", "boils
down to", and "on the fly" are the shape. Report a common word used in an
uncommon sense. Report a sentence that leaves out a word the reader has to
supply, as in "So does anyone in a server who cannot ban", where "so does"
stands in for a verb three words back. A long sentence is fine when it reads in
one pass, so report the ones stacking clauses the reader has to hold at once
rather than counting words.

Leave the domain terms alone. Discord, gateway, interaction, snowflake,
permission bits, and every framework symbol name real things, and this reader
either knows them or can look them up. This pass hunts the English a dictionary
does not resolve.

Return only a list. For each finding give the exact sentence, the pattern's name
as written above, and the repair. Name the pattern rather than numbering it,
since a number can drift out of step with the rulebook. Where a pattern produced
nothing, say so in one line rather than omitting it.
```
