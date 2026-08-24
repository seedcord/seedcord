import { describe, expect, it } from 'vitest';

import { compileGuideMdx } from './mdxPipeline';

describe('a markdown image', () => {
    it('keeps its src a string the component map can render', async () => {
        const code = await compileGuideMdx('![the mark](/logo.svg)');

        expect(code).toContain('src="/logo.svg"');
    });

    it('carries the size read off the file', async () => {
        const code = await compileGuideMdx('![the mark](/logo.svg)');

        expect(code).toContain('width="596.16"');
        expect(code).toContain('height="500.4"');
    });
});

describe('heading depth', () => {
    it('takes h2 through h4', async () => {
        await expect(compileGuideMdx(['## two', '', '### three', '', '#### four'].join('\n'))).resolves.toContain(
            '_components.h4'
        );
    });

    it.each([
        ['# one', 'h1'],
        ['##### five', 'h5'],
        ['###### six', 'h6']
    ])('refuses %s', async (source, name) => {
        await expect(compileGuideMdx(source)).rejects.toThrow(name);
    });

    // a lowercase jsx tag skips the component map
    it.each(['<h5>five</h5>', '<p>a paragraph</p>', '<table><tbody /></table>'])(
        'refuses %s written as jsx',
        async (source) => {
            await expect(compileGuideMdx(source)).rejects.toThrow();
        }
    );

    it('leaves a tag the map never claims alone', async () => {
        await expect(compileGuideMdx('a line<br />and another')).resolves.toContain('br');
    });

    it('points at the line the heading is on', async () => {
        const thrown = await compileGuideMdx(['## two', '', '##### five'].join('\n')).catch((error: unknown) => error);

        expect(thrown).toMatchObject({ line: 3, file: 'content/docs/sample.mdx' });
    });
});

describe('a fence caption', () => {
    function fence(meta: string): string {
        return [`\`\`\`ts ${meta}`, 'const a = 1;', '```'].join('\n');
    }

    it('carries the title through to the code element', async () => {
        const code = await compileGuideMdx(fence('title="src/commands/Ping.ts"'));

        expect(code).toContain('src/commands/Ping.ts');
    });

    it('marks a fence the author tagged as output', async () => {
        const code = await compileGuideMdx(fence('output'));

        expect(code).toContain('data-output');
    });

    it('leaves an untagged fence unmarked', async () => {
        const code = await compileGuideMdx(fence('title="a.ts"'));

        expect(code).not.toContain('data-output');
    });

    it('reads the word output outside the title only', async () => {
        const code = await compileGuideMdx(fence('title="build output log.ts"'));

        expect(code).toContain('build output log.ts');
        expect(code).not.toContain('data-output');
    });

    it('reads hovers as its own flag', async () => {
        const plain = await compileGuideMdx(fence('twoslash'));
        const withHovers = await compileGuideMdx(fence('twoslash hovers'));

        expect(plain).not.toContain('data-hovers');
        expect(withHovers).toContain('data-hovers');
    });

    it('refuses hovers without twoslash', async () => {
        await expect(compileGuideMdx(fence('hovers'))).rejects.toThrow('hovers needs twoslash');
    });

    it('refuses a js fence tagged twoslash', async () => {
        const source = ['```js twoslash', 'const a = 1;', '```'].join('\n');

        await expect(compileGuideMdx(source)).rejects.toThrow('twoslash');
    });

    it.each(['twoslash', 'twoslash output', 'output twoslash', 'title="a.ts" twoslash', 'twoslash title="a.ts"'])(
        'reads the flag out of the meta %s',
        async (meta) => {
            await expect(compileGuideMdx(fence(meta))).resolves.toContain('data-twoslash');
        }
    );

    it('leaves an untagged fence unchecked', async () => {
        await expect(compileGuideMdx(fence('title="a.ts"'))).resolves.not.toContain('data-twoslash');
    });

    it.each(['tsx', 'typescript'])('takes the flag on a %s fence', async (lang) => {
        const source = [`\`\`\`${lang} twoslash`, 'const a = 1;', '```'].join('\n');

        await expect(compileGuideMdx(source)).resolves.toContain('data-twoslash');
    });

    it('reads the word twoslash outside the title only', async () => {
        const code = await compileGuideMdx(fence('title="twoslash notes.ts"'));

        expect(code).toContain('twoslash notes.ts');
        expect(code).not.toContain('data-twoslash');
    });
});

describe('a pipe table', () => {
    it('parses into a table the component map can style', async () => {
        const code = await compileGuideMdx(['| a | b |', '| --- | --- |', '| 1 | 2 |'].join('\n'));

        expect(code).toContain('_components.table');
    });
});
