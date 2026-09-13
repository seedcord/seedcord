import { describe, expect, it } from 'vitest';

import { ChangesetRule } from '#src/release/ChangesetRule';

const PACKAGES = new Map([
    ['@seedcord/core', '0.7.0'],
    ['@seedcord/gateway', '0.6.0'],
    ['@seedcord/eslint-config', '2.2.1']
]);

const changeset = (frontmatter: string, summary: string): string => `---\n${frontmatter}\n---\n\n${summary}\n`;

describe('ChangesetRule package names', () => {
    it('flags a package outside the workspace', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations('add-thing.md', changeset("'@seedcord/nope': minor", 'A thing changed.'));

        expect(found).toEqual([{ file: 'add-thing.md', reason: 'unknown-package', detail: '@seedcord/nope' }]);
    });

    it('accepts a workspace package', () => {
        const rule = new ChangesetRule(PACKAGES);

        expect(rule.violations('add-thing.md', changeset("'@seedcord/core': minor", 'A thing changed.'))).toEqual([]);
    });
});

describe('ChangesetRule bump types', () => {
    it('flags a major bump while the repo is pre-1.0', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations('big.md', changeset("'@seedcord/core': major", 'A thing changed.'));

        expect(found).toEqual([{ file: 'big.md', reason: 'pre-1.0-major', detail: '@seedcord/core' }]);
    });

    it('accepts a major bump on a package past 1.0', () => {
        const rule = new ChangesetRule(PACKAGES);

        const summary = '**BREAKING:** Dropped the `legacy` preset.';

        expect(rule.violations('v3.md', changeset("'@seedcord/eslint-config': major", summary))).toEqual([]);
    });

    it('accepts minor and patch', () => {
        const rule = new ChangesetRule(PACKAGES);

        expect(rule.violations('a.md', changeset("'@seedcord/core': minor", 'A thing changed.'))).toEqual([]);
        expect(rule.violations('b.md', changeset("'@seedcord/gateway': patch", 'Fixed a thing.'))).toEqual([]);
    });
});

describe('ChangesetRule shape', () => {
    const rule = new ChangesetRule(PACKAGES);

    it('flags a second paragraph', () => {
        const summary = 'Every handler takes a `DispatchContext`.\n\nThe bag moved to `this.dispatch`.';

        expect(rule.violations('two.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'two.md', reason: 'multi-line', detail: '2 lines' }
        ]);
    });

    it('flags one line that opens as a list, a heading or a quote', () => {
        for (const [summary, start] of [
            ['- Added `x`.', '-'],
            ['1. Added `x`.', '1.'],
            ['## Added `x`.', '##'],
            ['> Added `x`.', '>']
        ] as const) {
            expect(rule.violations('block.md', changeset("'@seedcord/core': minor", summary))).toEqual([
                { file: 'block.md', reason: 'block-start', detail: start }
            ]);
        }
    });

    it('flags a list', () => {
        const summary = 'Added gates.\n- `OwnerOnly`\n- `GuildOnly`';

        expect(rule.violations('list.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'list.md', reason: 'multi-line', detail: '3 lines' }
        ]);
    });
});

describe('ChangesetRule breaking marker', () => {
    it('flags a marker with the colon outside the bold', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations('old.md', changeset("'@seedcord/core': minor", '**BREAKING**: A thing changed.'));

        expect(found).toEqual([{ file: 'old.md', reason: 'breaking-marker', detail: '**BREAKING**:' }]);
    });

    it('flags the italic variant', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations(
            'peer.md',
            changeset("'@seedcord/core': minor", '_Kinda BREAKING?:_ envapt is a peer dependency now.')
        );

        expect(found).toEqual([{ file: 'peer.md', reason: 'breaking-marker', detail: 'BREAKING?:_' }]);
    });

    it('flags the marker sitting inside a sentence', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations(
            'mid.md',
            changeset("'@seedcord/core': minor", 'This one is **BREAKING:** for gateway.')
        );

        expect(found).toEqual([{ file: 'mid.md', reason: 'breaking-marker', detail: '**BREAKING:**' }]);
    });

    it('flags the marker alone on its line, which the changelog would file under minor', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations(
            'alone.md',
            changeset("'@seedcord/core': minor", '**BREAKING:**\nRenamed a thing.')
        );

        expect(found).toEqual([
            { file: 'alone.md', reason: 'multi-line', detail: '2 lines' },
            { file: 'alone.md', reason: 'breaking-marker', detail: '**BREAKING:**' }
        ]);
    });

    it('leaves a BREAKING inside a code span alone', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations('span.md', changeset("'@seedcord/core': minor", 'Reads `BREAKING_CHANGE` now.'));

        expect(found).toEqual([]);
    });

    it('flags the marker spelled in mixed case', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations(
            'case.md',
            changeset("'@seedcord/core': minor", '**Breaking:** Renamed a thing.')
        );

        expect(found).toEqual([{ file: 'case.md', reason: 'breaking-marker', detail: '**Breaking:**' }]);
    });

    it('leaves an identifier that contains BREAKING alone', () => {
        const rule = new ChangesetRule(PACKAGES);

        expect(rule.violations('id.md', changeset("'@seedcord/core': minor", 'Added the NON_BREAKING flag.'))).toEqual(
            []
        );
    });

    it('flags the marker on a changeset that bumps only patches', () => {
        const rule = new ChangesetRule(PACKAGES);

        const found = rule.violations('patch.md', changeset("'@seedcord/core': patch", '**BREAKING:** Removed `x`.'));

        expect(found).toEqual([{ file: 'patch.md', reason: 'breaking-patch', detail: '@seedcord/core' }]);
    });

    it('flags the marker when any release in the changeset is a patch', () => {
        const rule = new ChangesetRule(PACKAGES);
        const text = changeset(
            "'@seedcord/core': minor\n'@seedcord/gateway': patch",
            '**BREAKING:** Renamed `a` to `b`.'
        );

        expect(rule.violations('mixed.md', text)).toEqual([
            { file: 'mixed.md', reason: 'breaking-patch', detail: '@seedcord/gateway' }
        ]);
    });

    it('flags the underscore spellings of the marker', () => {
        const rule = new ChangesetRule(PACKAGES);

        for (const marker of ['_BREAKING:_', '__BREAKING:__']) {
            expect(rule.violations('u.md', changeset("'@seedcord/core': minor", `${marker} Renamed a thing.`))).toEqual(
                [{ file: 'u.md', reason: 'breaking-marker', detail: marker }]
            );
        }
    });

    it('leaves a hyphenated word and a link target alone', () => {
        const rule = new ChangesetRule(PACKAGES);

        for (const summary of ['Added a NON-BREAKING option.', 'Moved the [notes](https://x.dev/BREAKING.md).']) {
            expect(rule.violations('ok.md', changeset("'@seedcord/core': minor", summary))).toEqual([]);
        }
    });

    it('flags an empty summary', () => {
        const rule = new ChangesetRule(PACKAGES);

        expect(rule.violations('empty.md', changeset("'@seedcord/core': patch", ''))).toEqual([
            { file: 'empty.md', reason: 'empty-summary', detail: 'no summary' }
        ]);
    });

    it('accepts the shipped cooldown changeset', () => {
        const rule = new ChangesetRule(PACKAGES);

        const summary =
            '**BREAKING:** Fixed the cooldown on a handler registered on two buttons. Because its route id joined both into `button:confirm,cancel`, clicking either one put both on cooldown. Now it would just be `button:confirm`, for example.';

        expect(rule.violations('cooldown.md', changeset("'@seedcord/gateway': minor", summary))).toEqual([]);
    });
});

describe('ChangesetRule length', () => {
    const rule = new ChangesetRule(PACKAGES);

    it('accepts three sentences on a minor', () => {
        const summary =
            'Added `dispatchId` to every bus key a dispatch publishes, and `dispatch.id` to the bag behind it. A fault used to carry no way back to the dispatch that raised it, so pairing one with its `interactionDispatched` meant guessing from the route and the clock. Key a store on it to line up a dispatch, its writes, and its faults.';

        expect(rule.violations('dispatch-id.md', changeset("'@seedcord/core': minor", summary))).toEqual([]);
    });

    it('flags a fourth sentence', () => {
        const summary = 'One thing changed. A second thing changed. A third thing changed. A fourth thing changed.';

        expect(rule.violations('long.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'long.md', reason: 'too-long', detail: '4 sentences' }
        ]);
    });

    it('reads etc. and i.e. inside a sentence as part of it', () => {
        const summary = 'Fixed buttons, menus, etc. on reply, i.e. every component.';

        expect(rule.violations('etc.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([]);
    });

    it('reads a period inside a code span as prose, never a sentence end', () => {
        const summary = 'Reading `dispatch.id` on `discord.js` 0.7.0 now returns the matched route.';

        expect(rule.violations('spans.md', changeset("'@seedcord/core': minor", summary))).toEqual([]);
    });

    it('holds a patch to one sentence', () => {
        const summary = 'Fixed the reload. It also logs the duration now.';

        expect(rule.violations('fix.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([
            { file: 'fix.md', reason: 'too-long', detail: '2 sentences' }
        ]);
    });

    it('reads e.g. as part of its sentence', () => {
        const summary = 'Fixed a route, e.g. `button:confirm`, that matched two handlers.';

        expect(rule.violations('eg.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([]);
    });

    it('reads vs. as part of its sentence', () => {
        const summary = 'Fixed the order of `reply` vs. `followUp` on a deferred interaction.';

        expect(rule.violations('vs.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([]);
    });

    it('accepts one sentence on a patch', () => {
        const summary = 'Fixed a plugin whose `init()` outlasts its timeout.';

        expect(rule.violations('fix.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([]);
    });
});

describe('ChangesetRule punctuation', () => {
    const rule = new ChangesetRule(PACKAGES);

    it('flags an em dash', () => {
        const summary = 'The client retries on 429 — up to three times.';

        expect(rule.violations('dash.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'dash.md', reason: 'banned-punctuation', detail: '—' }
        ]);
    });

    it('flags an en dash', () => {
        const summary = 'The window covers 5–10 seconds.';

        expect(rule.violations('en.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'en.md', reason: 'banned-punctuation', detail: '–' }
        ]);
    });

    it('flags a semicolon', () => {
        const summary = 'The cache is keyed by file; a rename lands as a fresh entry.';

        expect(rule.violations('semi.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'semi.md', reason: 'banned-punctuation', detail: ';' }
        ]);
    });

    it('leaves a semicolon inside a code span alone', () => {
        const summary = 'Reading `a; b` now returns the matched route.';

        expect(rule.violations('span.md', changeset("'@seedcord/core': minor", summary))).toEqual([]);
    });
});

describe('ChangesetRule banned words', () => {
    const rule = new ChangesetRule(PACKAGES);

    it('flags a hype word', () => {
        const summary = 'The dispatcher is more performant now.';

        expect(rule.violations('hype.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'hype.md', reason: 'banned-word', detail: 'performant' }
        ]);
    });

    it('flags a reader-reaction opener', () => {
        const summary = 'Worth noting that the bag now carries the route.';

        expect(rule.violations('note.md', changeset("'@seedcord/core': minor", summary))).toEqual([
            { file: 'note.md', reason: 'banned-word', detail: 'worth noting' }
        ]);
    });

    it('reads a banned word inside a longer word as prose', () => {
        const summary = 'The leverages field on the payout record now parses.';

        expect(rule.violations('sub.md', changeset("'@seedcord/core': minor", summary))).toEqual([]);
    });
});

describe('ChangesetRule fix opener', () => {
    const rule = new ChangesetRule(PACKAGES);

    it('flags the imperative opener', () => {
        const summary = 'Fix the cooldown on a handler registered on two buttons.';

        expect(rule.violations('imp.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([
            { file: 'imp.md', reason: 'fix-opener', detail: 'Fix' }
        ]);
    });

    it('flags the third-person opener', () => {
        const summary = 'Fixes the reload on a deleted file.';

        expect(rule.violations('third.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([
            { file: 'third.md', reason: 'fix-opener', detail: 'Fixes' }
        ]);
    });

    it('flags a lowercase opener', () => {
        const summary = 'fixed the reload on a deleted file.';

        expect(rule.violations('lower.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([
            { file: 'lower.md', reason: 'fix-opener', detail: 'fixed' }
        ]);
    });

    it('flags the -ing opener', () => {
        const summary = 'Fixing the reload on a deleted file.';

        expect(rule.violations('ing.md', changeset("'@seedcord/gateway': patch", summary))).toEqual([
            { file: 'ing.md', reason: 'fix-opener', detail: 'Fixing' }
        ]);
    });

    it('accepts Fixed, with or without the breaking marker', () => {
        const plain = 'Fixed a plugin whose `init()` outlasts its timeout.';
        const breaking = '**BREAKING:** Fixed the cooldown on two buttons.';

        expect(rule.violations('a.md', changeset("'@seedcord/gateway': patch", plain))).toEqual([]);
        expect(rule.violations('b.md', changeset("'@seedcord/gateway': minor", breaking))).toEqual([]);
    });

    it('leaves a body that opens on something else alone', () => {
        const summary = 'The transport packages now export `prefixOf` and `decodeFor`.';

        expect(rule.violations('export.md', changeset("'@seedcord/core': patch", summary))).toEqual([]);
    });
});
