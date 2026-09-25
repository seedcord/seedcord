import { describe, expect, it } from 'vitest';

import { brokenLinks, loadGuideSite, siteFrom } from './linkGate';

const COOLDOWN = '---\ntitle: Cooldown\n---\n\n## Per user\n\ntext\n\n## `cooldown()` options\n';

const SITE = siteFrom({
    pages: {
        '/': '---\ntitle: Start\n---\n\n## Philosophy\n',
        '/checks/cooldown': COOLDOWN
    },
    files: ['/portal-token.webp'],
    symbols: { core: ['notice', 'paginator'] }
});

function problemsIn(source: string): string[] {
    return brokenLinks(SITE, '/', `---\ntitle: Start\n---\n\n## Philosophy\n\n${source}\n`);
}

describe('the link gate', () => {
    it.each([
        ['a page', '[cooldowns](/checks/cooldown)'],
        ['a page written with its slash', '[cooldowns](/checks/cooldown/)'],
        ['a heading on another page', '[per user](/checks/cooldown#per-user)'],
        ['a heading holding code', '[options](/checks/cooldown/#cooldown-options)'],
        ['a heading on this page', '[why](#philosophy)'],
        ["a page's markdown twin", '[the twin](/checks/cooldown.md)'],
        ['a public file', '![token](/portal-token.webp)'],
        ['a symbol', '[Notice](ref:core/Notice)'],
        ['a member of a symbol', '[start](ref:core/Paginator#start)'],
        ['a package', '[core](ref:core)'],
        ['another site', '[docs](https://docs.seedcord.org/nothing-checks-this)']
    ])('passes a link to %s', (_what, link) => {
        expect(problemsIn(link)).toEqual([]);
    });

    it.each([
        ['a page that does not exist', '[gone](/checks/cooldowns)'],
        ['a heading the page does not have', '[gone](/checks/cooldown#per-guild)'],
        ['a heading this page does not have', '[gone](#principles)'],
        ['a missing public file', '![gone](/portal-secret.webp)'],
        ['a symbol the package does not export', '[gone](ref:core/Noticed)'],
        ['a package the reference site does not list', '[gone](ref:cor/Notice)'],
        ['a page that moved', '[moved](/gates/cooldown)'],
        ['a page that does not exist, by reference', '[gone][g]\n\n[g]: /checks/cooldowns']
    ])('reports a link to %s', (_what, link) => {
        expect(problemsIn(link)).toHaveLength(1);
    });

    it('reports the line the broken link sits on', () => {
        expect(problemsIn('fine\n\n[gone](/nowhere)')).toEqual([expect.stringContaining('/:9 /nowhere')]);
    });
});

describe('the guide', () => {
    it('links only to pages, headings, files, and symbols that exist', async () => {
        const site = await loadGuideSite();
        const problems = [...site.sources].flatMap(([route, source]) => brokenLinks(site, route, source));

        expect(problems).toEqual([]);
    });
});
