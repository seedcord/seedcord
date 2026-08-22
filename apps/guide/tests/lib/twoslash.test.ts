import { afterEach, describe, expect, it, vi } from 'vitest';

import { twoslashBlock } from '#lib/twoslash';

function sample(...lines: string[]): string {
    return lines.join('\n');
}

async function render(code: string, lang: 'ts' | 'tsx' | 'typescript' = 'ts'): Promise<string> {
    const { html } = await twoslashBlock(code, lang, true);

    return html ?? '';
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('the twoslash transformer', () => {
    it('renders a declared compile error as a line', async () => {
        const html = await render(sample('// @errors: 2322', 'const count: number = "twelve";'));

        expect(html).toContain('twoslash-error-line');
        expect(html).toContain("Type 'string' is not assignable to type 'number'.");
    });

    it('resolves a seedcord import', async () => {
        const html = await render(
            sample(
                "import { SlashHandler } from '@seedcord/gateway';",
                '',
                'export class Ping extends SlashHandler<never> {',
                '    public async execute(): Promise<void> {}',
                '}'
            )
        );

        expect(html).toContain('class="shiki shiki-light seedcord-light twoslash');
        expect(html).not.toContain('twoslash-error-line');
    });

    it('names an undeclared error instead of falling back to plain text', async () => {
        await expect(render('const count: number = "twelve";')).rejects.toThrow('not marked as being expected: 2322');
    });

    it('stamps the error column so the caret can point at the squiggle', async () => {
        const html = await render(sample('// @errors: 2322', 'const count: number = "twelve";'));

        // count starts at 6 and runs 5 wide
        expect(html).toContain('--ts-col:8.5');
    });

    it('renders a type query as a line', async () => {
        const html = await render(
            sample("const routes = ['ping', 'ban'] as const;", 'const first = routes[0];', '//    ^?')
        );

        expect(html).toContain('twoslash-query-line');
        expect(html).toContain('twoslash-popup-code');
        expect(html.replaceAll(/<[^>]+>/g, '')).toContain('const first: "ping"');
    });

    it('types a route generic off the stand-in augmentation', async () => {
        const html = await render(
            sample(
                "import { SlashHandler, SlashRoute } from '@seedcord/gateway';",
                '',
                "@SlashRoute('ping')",
                "export class Ping extends SlashHandler<'ping'> {",
                '    public async execute(): Promise<void> {',
                "        const detailed = this.options.getBoolean('detailed');",
                '    }',
                '}'
            )
        );

        expect(html).not.toContain('twoslash-error-line');
    });

    it('resolves node globals', async () => {
        const html = await render('const token = process.env.DISCORD_BOT_TOKEN;');

        expect(html).not.toContain('twoslash-error-line');
    });

    it('types a route on the http transport too', async () => {
        const html = await render(
            sample(
                "import { SlashHandler, SlashRoute } from '@seedcord/http';",
                '',
                "@SlashRoute('ping')",
                "export class Ping extends SlashHandler<'ping'> {",
                '    public async execute(): Promise<void> {',
                "        const detailed = this.options.getBoolean('detailed');",
                '    }',
                '}'
            )
        );

        expect(html).not.toContain('twoslash-error-line');
    });

    it('keeps a tsx block off a ts block of the same source', async () => {
        const source = 'const id = <T>(v: T): T => v;';

        await render(source);

        await expect(render(source, 'tsx')).rejects.toThrow('not marked as being expected');
    });

    it('carries the type on a hovered token, without its tsdoc', async () => {
        const html = await render("const routes = ['ping'] as const;");

        expect(html).toContain('twoslash-hover');
        expect(html).toContain('twoslash-popup-code');
        expect(html).not.toContain('twoslash-popup-docs');
    });

    it('keeps two blocks apart when they render back to back', async () => {
        const first = await render(sample('// @errors: 2322', 'const count: number = "twelve";'));
        const second = await render(sample('// @errors: 2322', 'const name: string = 12;'));

        expect(first).toContain("Type 'string' is not assignable to type 'number'.");
        expect(second).toContain("Type 'number' is not assignable to type 'string'.");
        expect(second).not.toContain("Type 'string' is not assignable to type 'number'.");
    });

    it('stays out of the way when the fence carries no flag', async () => {
        const { html } = await twoslashBlock('const count = 12;', 'ts', false);

        expect(html).not.toContain('twoslash');
    });

    it('hands the copy button a sample with no twoslash notation', async () => {
        const { text } = await twoslashBlock(sample('// @errors: 2322', 'const count: number = "twelve";'), 'ts', true);

        expect(text).toBe('const count: number = "twelve";');
    });

    it('renders the stripped sample while TWOSLASH is 0', async () => {
        vi.stubEnv('TWOSLASH', '0');

        const { html, text } = await twoslashBlock(
            sample('// @errors: 2322', 'const count: number = "twelve";'),
            'ts',
            true
        );

        expect(html).not.toContain('twoslash');
        expect(text).toBe('const count: number = "twelve";');
    });

    it('renders a completion list at the cursor column', async () => {
        const html = await render(
            sample('// @noErrors', 'const routes = { ping: 1, pong: 2 };', 'routes.p', '//      ^|')
        );

        expect(html).toContain('twoslash-completion-list');
        expect(html).toContain('--ts-col:8');
        expect(html).toContain('twoslash-completions-matched');
    });

    it('type-checks a fence tagged typescript', async () => {
        await expect(render('const count: number = "twelve";', 'typescript')).rejects.toThrow(
            'not marked as being expected: 2322'
        );
    });

    it('quotes the sample when the compiler crashes on a marker past the end of its line', async () => {
        const source = sample('// @noErrors', 'const routes = { ping: 1 };', 'routes.p', '//          ^|');

        await expect(render(source)).rejects.toThrow('routes.p');
    });

    describe('a sample cut out of a class body', () => {
        const nested = sample(
            "import { SlashHandler, SlashRoute } from '@seedcord/gateway';",
            '',
            "@SlashRoute('ping')",
            "class Ping extends SlashHandler<'ping'> {",
            '    public async execute(): Promise<void> {',
            '// ---cut---',
            "        await this.reply('Pong');",
            '// ---cut-after---',
            '    }',
            '}'
        );

        it('copies without the indentation it was nested under', async () => {
            const { text } = await twoslashBlock(nested, 'ts', true);

            expect(text).toBe("await this.reply('Pong');");
        });

        it('renders without the indentation it was nested under', async () => {
            const html = await render(nested);

            expect(html.replaceAll(/<[^>]+>/g, '')).not.toContain('    await this.reply');
        });

        it('moves the error caret along with the code', async () => {
            const html = await render(
                sample(
                    '// @errors: 2345',
                    "import { SlashHandler, SlashRoute } from '@seedcord/gateway';",
                    "@SlashRoute('ping')",
                    "class Ping extends SlashHandler<'ping'> {",
                    '    public async execute(): Promise<void> {',
                    '// ---cut---',
                    "        this.options.getBoolean('detaild');",
                    '// ---cut-after---',
                    '    }',
                    '}'
                )
            );

            // once the 8 spaces are gone the 9-wide argument starts at 24
            expect(html).toContain('--ts-col:28.5');
        });
    });

    describe('a hovered symbol a seedcord package declares', () => {
        it('carries the package and the symbol', async () => {
            const html = await render(
                sample("import { SlashHandler } from '@seedcord/gateway';", 'declare const h: SlashHandler<never>;')
            );

            expect(html).toContain('data-ref-pkg="gateway"');
            expect(html).toContain('data-ref-symbol="SlashHandler"');
        });

        it('nests a member the way the reference site does', async () => {
            const html = await render(
                sample(
                    "import { SlashHandler, SlashRoute } from '@seedcord/gateway';",
                    "@SlashRoute('ping')",
                    "class Ping extends SlashHandler<'ping'> {",
                    '    public async execute(): Promise<void> {',
                    "        this.options.getBoolean('detailed');",
                    '    }',
                    '}'
                )
            );

            expect(html).toContain('data-ref-symbol="SlashHandler.options"');
        });

        it('resolves through a cut that removed the import', async () => {
            const html = await render(
                sample(
                    "import { SlashHandler } from '@seedcord/gateway';",
                    '// ---cut---',
                    'declare const handler: SlashHandler<never>;'
                )
            );

            expect(html).toContain('data-ref-pkg="gateway"');
        });

        it('leaves the sample and the stdlib unlinked', async () => {
            const html = await render(sample('const count = 12;', 'const doubled = count * 2;'));

            expect(html).toContain('twoslash-hover');
            expect(html).not.toContain('data-ref-pkg');
        });
    });

    it('marks a highlighted run', async () => {
        const html = await render(sample('const token = 1;', '//    ^^^^^'));

        expect(html).toContain('twoslash-highlighted');
    });

    it('leaves the copy text without a trailing blank line', async () => {
        const { text } = await twoslashBlock(sample('const first = 1;', '//    ^?'), 'ts', true);

        expect(text).toBe('const first = 1;');
    });
});
