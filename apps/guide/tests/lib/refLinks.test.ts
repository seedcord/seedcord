import { describe, expect, it } from 'vitest';

import { compileGuideMdx } from '../mdxPipeline';

describe('a ref: link', () => {
    it('becomes the Ref component', async () => {
        const code = await compileGuideMdx('A gate refuses by throwing [Notice](ref:core/Notice).');

        expect(code).toContain('<Ref pkg="core" symbol="Notice">');
    });

    it('takes link text that differs from the symbol', async () => {
        const code = await compileGuideMdx('Throw [the notice card](ref:core/Notice) instead.');

        expect(code).toContain('symbol="Notice"');
        expect(code).toContain('the notice card');
    });

    it('reaches a link nested inside a table cell', async () => {
        const source = ['| what | throws |', '| --- | --- |', '| a gate | [Notice](ref:core/Notice) |'].join('\n');
        const code = await compileGuideMdx(source);

        expect(code).toContain('<Ref pkg="core" symbol="Notice">');
    });

    // mdx reads a bare <Options> in link text as a jsx tag and fails on it
    it('takes a generic written inside backticks', async () => {
        const code = await compileGuideMdx('a [`Plugin<Options>`](ref:core/Plugin) link');

        expect(code).toContain('symbol="Plugin"');
        expect(code).toContain('Plugin<Options>');
    });

    it('reaches a link inside a callout', async () => {
        const code = await compileGuideMdx('<Callout type="note">a [Notice](ref:core/Notice) link</Callout>');

        expect(code).toContain('<Ref pkg="core" symbol="Notice">');
    });

    it.each(['a <Ref pkg="core">Notice</Ref> link', '<Ref pkg="core">Notice</Ref>'])(
        'refuses %s written as jsx',
        async (source) => {
            await expect(compileGuideMdx(source)).rejects.toThrow('prettier splits');
        }
    );

    it('leaves an ordinary link alone', async () => {
        const code = await compileGuideMdx('Read [the reference site](https://docs.seedcord.org).');

        expect(code).toContain('href="https://docs.seedcord.org"');
        expect(code).not.toContain('<Ref');
    });

    it.each(['ref:core', 'ref:core/', 'ref:/Notice', 'ref:core/a/b', 'ref:'])('refuses %s', async (target) => {
        await expect(compileGuideMdx(`a [symbol](${target}) link`)).rejects.toThrow('is missing the package');
    });

    // fumadocs copies heading children into a module-scope toc export, where Ref has no binding
    it('refuses one inside a heading', async () => {
        await expect(compileGuideMdx('## a [Notice](ref:core/Notice) heading')).rejects.toThrow('heading');
    });

    it('refuses a reference-style definition', async () => {
        const source = ['a [Notice][n] link', '', '[n]: ref:core/Notice'].join('\n');

        await expect(compileGuideMdx(source)).rejects.toThrow('symbol link');
    });

    it('refuses one with no link text', async () => {
        await expect(compileGuideMdx('a [](ref:core/Notice) link')).rejects.toThrow('has no link text');
    });

    it('points at the line the bad link is on', async () => {
        const source = ['## two', '', 'a [symbol](ref:core) link'].join('\n');
        const thrown = await compileGuideMdx(source).catch((error: unknown) => error);

        expect(thrown).toMatchObject({ line: 3, file: 'content/docs/sample.mdx' });
    });
});
