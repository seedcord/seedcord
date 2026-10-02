import { describe, expect, it } from 'vitest';

import { compileGuideMdx } from '../mdxPipeline';

const NOTICE = 'href="https://seedcord.org/docs/packages/core/latest/classes/notice"';

describe('a ref: link', () => {
    it('links to the page the reference site renders for the symbol', async () => {
        const code = await compileGuideMdx('A gate refuses by throwing [Notice](ref:core/Notice).');

        expect(code).toContain(`<Ref ${NOTICE}>`);
    });

    it.each(['PaginatorBase#start', 'PaginatorBase.start'])('anchors %s on the page of its owner', async (symbol) => {
        const code = await compileGuideMdx(`call [start](ref:core/${symbol}) first`);

        expect(code).toContain('href="https://seedcord.org/docs/packages/core/latest/classes/paginator-base#start"');
    });

    it('kebab-cases a multi-word name the way the reference site does', async () => {
        const code = await compileGuideMdx('extend [SlashHandler](ref:gateway/SlashHandler)');

        expect(code).toContain('href="https://seedcord.org/docs/packages/gateway/latest/classes/slash-handler"');
    });

    it('links a package to its overview', async () => {
        const code = await compileGuideMdx('install [`@seedcord/plugin-mongoose`](ref:plugin-mongoose) first');

        expect(code).toContain('href="https://seedcord.org/docs/packages/plugin-mongoose/latest"');
    });

    it('refuses a symbol the reference site does not document', async () => {
        await expect(compileGuideMdx('a [Nope](ref:core/NotASymbol) link')).rejects.toThrow('NotASymbol');
    });

    it('refuses a package the reference site does not list', async () => {
        await expect(compileGuideMdx('a [thing](ref:nope/Thing) link')).rejects.toThrow('does not list');
    });

    it('takes link text that differs from the symbol', async () => {
        const code = await compileGuideMdx('Throw [the notice card](ref:core/Notice) instead.');

        expect(code).toContain(NOTICE);
        expect(code).toContain('the notice card');
    });

    it('reaches a link nested inside a table cell', async () => {
        const source = ['| what | throws |', '| --- | --- |', '| a gate | [Notice](ref:core/Notice) |'].join('\n');

        expect(await compileGuideMdx(source)).toContain(NOTICE);
    });

    // mdx reads a bare <Options> in link text as a jsx tag and fails on it
    it('takes a generic written inside backticks', async () => {
        const code = await compileGuideMdx('a [`Plugin<Options>`](ref:core/Plugin) link');

        expect(code).toContain('href="https://seedcord.org/docs/packages/core/latest/classes/plugin"');
        expect(code).toContain('Plugin<Options>');
    });

    it('reaches a link inside a callout', async () => {
        const code = await compileGuideMdx('<Callout type="note">a [Notice](ref:core/Notice) link</Callout>');

        expect(code).toContain(NOTICE);
    });

    it.each(['a <Ref href="/x">Notice</Ref> link', '<Ref href="/x">Notice</Ref>'])(
        'refuses %s written as jsx',
        async (source) => {
            await expect(compileGuideMdx(source)).rejects.toThrow('prettier splits');
        }
    );

    it('leaves an ordinary link alone', async () => {
        const code = await compileGuideMdx('Read [the reference site](https://seedcord.org/docs).');

        expect(code).toContain('href="https://seedcord.org/docs"');
        expect(code).not.toContain('<Ref');
    });

    it.each(['ref:core/', 'ref:/Notice', 'ref:core/a/b', 'ref:'])('refuses %s', async (target) => {
        await expect(compileGuideMdx(`a [symbol](${target}) link`)).rejects.toThrow('is missing the package');
    });

    // fumadocs copies heading children into a module-scope toc export, where Ref has no binding
    it('refuses one inside a heading', async () => {
        await expect(compileGuideMdx('## a [Notice](ref:core/Notice) heading')).rejects.toThrow('heading');
    });

    it('refuses a reference-style definition', async () => {
        const source = ['a [Notice][n] link', '', '[n]: ref:core/Notice'].join('\n');

        await expect(compileGuideMdx(source)).rejects.toThrow('stays a plain url');
    });

    it('refuses one with no link text', async () => {
        await expect(compileGuideMdx('a [](ref:core/Notice) link')).rejects.toThrow('has no link text');
    });

    it('points at the line the bad link is on', async () => {
        const source = ['## two', '', 'a [symbol](ref:core/) link'].join('\n');
        const thrown = await compileGuideMdx(source).catch((error: unknown) => error);

        expect(thrown).toMatchObject({ line: 3, file: 'content/docs/sample.mdx' });
    });
});
