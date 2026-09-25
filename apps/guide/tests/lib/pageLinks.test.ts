import { describe, expect, it } from 'vitest';

import { compileGuideMdx } from '../mdxPipeline';

describe('a link to another guide page', () => {
    it('gains the trailing slash the page lives at', async () => {
        const code = await compileGuideMdx('Read [cooldowns](/checks/cooldown) first.');

        expect(code).toContain('href="/checks/cooldown/"');
    });

    it('keeps its anchor after the slash', async () => {
        const code = await compileGuideMdx('See [the intent](/events/messages#what-the-intent-gates).');

        expect(code).toContain('href="/events/messages/#what-the-intent-gates"');
    });

    it('gains the slash when written as a reference', async () => {
        const code = await compileGuideMdx('Read [cooldowns][c] first.\n\n[c]: /checks/cooldown\n');

        expect(code).toContain('href="/checks/cooldown/"');
    });

    it('stays as written when it already ends in a slash', async () => {
        const code = await compileGuideMdx('Back to [the start](/).');

        expect(code).toContain('href="/"');
    });

    it.each([
        ['a file', '[the twin](/commands/options.md)', 'href="/commands/options.md"'],
        ['an anchor on this page', '[below](#options)', 'href="#options"'],
        [
            'another site',
            '[docs](https://docs.seedcord.org/packages/core)',
            'href="https://docs.seedcord.org/packages/core"'
        ]
    ])('leaves a link to %s alone', async (_what, source, href) => {
        expect(await compileGuideMdx(source)).toContain(href);
    });
});
