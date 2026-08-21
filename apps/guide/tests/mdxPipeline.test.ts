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
});

describe('a pipe table', () => {
    it('parses into a table the component map can style', async () => {
        const code = await compileGuideMdx(['| a | b |', '| --- | --- |', '| 1 | 2 |'].join('\n'));

        expect(code).toContain('_components.table');
    });
});
