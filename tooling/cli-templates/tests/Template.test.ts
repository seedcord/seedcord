import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, beforeAll, describe, expect, it } from 'vitest';

import { Template } from '#src/Template';
import { templateFolder } from '#tests/templateFolder';
import { thrownBy } from '#tests/thrownBy';

import type { RenderProject } from '#src/TemplateOutput';

describe('Template.readAll', () => {
    it('lists each top-level folder as a template and skips folders starting with _', async () => {
        await using folder = await templateFolder({
            'Slash/commands/{{pascal name}}.ts.hbs': '',
            'Button/handlers/{{pascal name}}.ts.hbs': '',
            '_partials/header.hbs': '',
            'notes.md': ''
        });

        const templates = await Template.readAll(folder.path, 'templates/');

        expect(templates.map(({ name, from }) => ({ name, from }))).toEqual([
            { name: 'Button', from: 'templates/' },
            { name: 'Slash', from: 'templates/' }
        ]);
    });

    it('reads a missing folder as lacking templates', async () => {
        await using folder = await templateFolder({});

        await expect(Template.readAll(join(folder.path, 'missing'), 'templates/')).resolves.toEqual([]);
    });
});

const ROOT = '/bot/src';
const GATEWAY: RenderProject = { root: ROOT, transport: '@seedcord/gateway', runtime: 'server', helpers: {} };

// a path starting with _ stays beside the template, like _partials/header.hbs
async function onlyTemplate(files: Record<string, string>): Promise<AsyncDisposable & { template: Template }> {
    const folder = await templateFolder(
        Object.fromEntries(
            Object.entries(files).map(([path, body]) => [path.startsWith('_') ? path : `T/${path}`, body])
        )
    );
    const [template] = await Template.readAll(folder.path, 'templates/');
    assert(template);
    return { template, [Symbol.asyncDispose]: () => folder[Symbol.asyncDispose]() };
}

describe('TemplateOutput.render', () => {
    it('renders each file name and body to the same path under root', async () => {
        await using made = await onlyTemplate({
            'handlers/{{pascal name}}.ts.hbs': 'export class {{ pascal name }} {}\n'
        });

        expect(made.template.output('roll dice', GATEWAY).render({})).toEqual([
            { path: join(ROOT, 'handlers/RollDice.ts'), contents: 'export class RollDice {}\n' }
        ]);
    });

    it('turns the name into each casing a file needs', async () => {
        await using made = await onlyTemplate({
            'x.hbs': '{{pascal name}} {{camel name}} {{snake name}} {{kebab name}}'
        });

        const [file] = made.template.output('RollDice', GATEWAY).render({});

        expect(file?.contents).toBe('RollDice rollDice roll_dice roll-dice');
    });

    it('quotes an answer as a single-quoted string literal that reads back as typed', async () => {
        await using made = await onlyTemplate({ 'x.hbs': '{{quote reply}}' });
        const reply = `Don't "panic"\n\\ok`;

        const [file] = made.template.output('A', GATEWAY).render({ reply });

        expect(file?.contents.startsWith("'")).toBe(true);
        expect(runInNewContext(file?.contents ?? '')).toBe(reply);
    });

    it('fills the transport variables from the project', async () => {
        await using made = await onlyTemplate({ 'x.hbs': '{{transport}} {{isGateway}} {{isEdge}}' });
        const edge: RenderProject = { ...GATEWAY, transport: '@seedcord/http', runtime: 'edge' };

        const contents = [GATEWAY, edge].map((project) => made.template.output('A', project).render({})[0]?.contents);

        expect(contents).toEqual(['@seedcord/gateway true false', '@seedcord/http false true']);
    });

    it('gives each file the relative path back to root', async () => {
        await using made = await onlyTemplate({ 'top.hbs': '{{toRoot}}', 'handlers/deep/inner.hbs': '{{toRoot}}' });

        const contents = made.template
            .output('A', GATEWAY)
            .render({})
            .map((file) => file.contents);

        expect(contents).toEqual(['../..', '.']);
    });

    it('fills answers and runs the project helpers', async () => {
        const shout: RenderProject = { ...GATEWAY, helpers: { shout: (value: string) => value.toUpperCase() } };
        await using made = await onlyTemplate({ 'x.hbs': '{{shout description}}' });

        const [file] = made.template.output('A', shout).render({ description: 'roll some dice' });

        expect(file?.contents).toBe('ROLL SOME DICE');
    });

    it('puts a folder from the name under each file folder and lists the paths before rendering', async () => {
        await using made = await onlyTemplate({
            'components/{{pascal name}}.ts.hbs': '{{toRoot}}',
            'handlers/{{pascal name}}.ts.hbs': '{{toRoot}}'
        });

        const output = made.template.output('tickets/appeal', GATEWAY);

        expect(output.paths).toEqual([
            join(ROOT, 'components/tickets/Appeal.ts'),
            join(ROOT, 'handlers/tickets/Appeal.ts')
        ]);
        expect(output.render({})).toEqual(output.paths.map((path) => ({ path, contents: '../..' })));
    });

    describe('the name', () => {
        let template: Template;
        beforeAll(async () => {
            const made = await onlyTemplate({ 'x.hbs': '' });
            ({ template } = made);
            return () => made[Symbol.asyncDispose]();
        });

        it.each([
            '',
            '2fast',
            'roll!dice',
            'tickets/',
            '../Appeal',
            '/Appeal',
            'a//Appeal',
            'a/./Appeal',
            '  /Appeal',
            'tickets /Appeal',
            ' tickets/Appeal'
        ])('rejects %j before any path is built', (name) => {
            expect(() => template.output(name, GATEWAY)).toThrow(
                expect.objectContaining({ type: 'SeedcordTypeError', code: SeedcordErrorCode.MakeInvalidName })
            );
        });

        it.each(['roll dice', 'roll-dice', 'roll_dice', 'RollDice2', 'tickets/Appeal', 'a/b/Appeal'])(
            'accepts %j',
            (name) => {
                expect(() => template.output(name, GATEWAY)).not.toThrow();
            }
        );
    });

    it.each(['Appeal', 'appeal'])(
        'throws MakePathTaken for %j when two files of the template land on one path in any casing',
        async (name) => {
            await using made = await onlyTemplate({ '{{name}}.ts.hbs': '', '{{pascal name}}.ts.hbs': '' });

            expect(() => made.template.output(name, GATEWAY)).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.MakePathTaken })
            );
        }
    );

    it('imports the file another folder of the template writes', async () => {
        await using made = await onlyTemplate({
            'components/{{pascal name}}.ts.hbs': 'export const {{pascal name}}Id = 1;',
            'handlers/{{pascal name}}.ts.hbs': `import { {{pascal name}}Id } from '{{importOf "components"}}';`
        });

        const [, handler] = made.template.output('tickets/appeal', GATEWAY).render({});

        expect(handler?.contents).toBe(`import { AppealId } from '../../components/tickets/Appeal';`);
    });

    it.each([
        ['no file', { 'handlers/x.ts.hbs': '{{importOf "components"}}' }],
        [
            'two files',
            {
                'components/A.ts.hbs': '',
                'components/B.ts.hbs': '',
                'handlers/x.ts.hbs': '{{importOf "components"}}'
            }
        ]
    ])('throws when the folder importOf reads holds %s', async (_case, files) => {
        await using made = await onlyTemplate(files);

        expect(() => made.template.output('A', GATEWAY).render({})).toThrow(
            expect.objectContaining({ type: 'SeedcordTypeError', code: SeedcordErrorCode.MakeImportOfUnmatched })
        );
    });

    it.each([
        ['reads a value it was never given', '[{{description}}]', /description/],
        ['calls a helper that does not exist', '{{shout name}}', /shout/],
        ['calls a partial that does not exist', '{{> header}}', /header/],
        ['does not parse', '{{#if ready}}', /ready/]
    ])('throws MakeTemplateFailed, naming the file, when a template %s', async (_case, body, reason) => {
        await using made = await onlyTemplate({ 'handlers/x.ts.hbs': body });

        const error = thrownBy(() => made.template.output('A', GATEWAY).render({}));

        assert(isSeedcordError(error, 'SeedcordTypeError', SeedcordErrorCode.MakeTemplateFailed));
        expect(error.message).toContain('handlers/x.ts.hbs');
        expect(error.message).toMatch(reason);
        expect(error.cause).toBeInstanceOf(Error);
    });

    it('renders partials from the _partials folder beside the template, nested folders included', async () => {
        await using made = await onlyTemplate({
            '_partials/discord/imports.hbs': "import { {{names}} } from '{{transport}}';\n",
            'x.hbs': '{{> discord/imports names="Ping"}}\n{{pascal name}}'
        });

        const [file] = made.template.output('roll dice', GATEWAY).render({});

        expect(file?.contents).toBe("import { Ping } from '@seedcord/gateway';\nRollDice");
    });

    it('reads partials only from the folder the template came from', async () => {
        await using withPartial = await templateFolder({ '_partials/header.hbs': 'h', 'A/x.hbs': '{{> header}}' });
        await using without = await templateFolder({ 'B/x.hbs': '{{> header}}' });
        const [a] = await Template.readAll(withPartial.path, 'one/');
        const [b] = await Template.readAll(without.path, 'two/');
        assert(a && b);

        expect(a.output('A', GATEWAY).render({})[0]?.contents).toBe('h');
        expect(() => b.output('A', GATEWAY).render({})).toThrow(/header/);
    });
});

describe('TemplateOutput.inputs', () => {
    async function inputsFor(files: Record<string, string>, project = GATEWAY): Promise<unknown> {
        await using made = await onlyTemplate(files);
        return made.template.output('A', project).inputs();
    }

    it('asks for text or yes/no by how a template uses each value, and skips what the CLI fills', async () => {
        const inputs = await inputsFor(
            {
                'x.hbs': [
                    '{{description}} {{#if ephemeral}}e{{/if}} {{#unless guildOnly}}g{{/unless}}',
                    '{{#if note}}// {{note}}{{/if}} {{shout label}} {{pascal name}} {{transport}} {{toRoot}} {{quote description}}'
                ].join('\n')
            },
            { ...GATEWAY, helpers: { shout: (value: string) => value } }
        );

        expect(inputs).toEqual({
            description: { kind: 'text' },
            ephemeral: { kind: 'bool' },
            guildOnly: { kind: 'bool' },
            note: { kind: 'text' },
            label: { kind: 'text' }
        });
    });

    it('asks for a list of text or a list of entries by what each loop reads', async () => {
        const inputs = await inputsFor({
            'x.hbs': [
                "{{#each choices}}'{{this}}'{{#unless @last}},{{/unless}}{{/each}}",
                '{{#each options as |option i|}}{{option.name}}{{#if option.required}}!{{/if}}{{i}}{{/each}}',
                '{{#each groups}}{{title}}{{#each tags}}{{this}}{{/each}}{{/each}}'
            ].join('\n')
        });

        expect(inputs).toEqual({
            choices: { kind: 'list', item: { kind: 'text' } },
            options: {
                kind: 'list',
                item: { kind: 'object', fields: { name: { kind: 'text' }, required: { kind: 'bool' } } }
            },
            groups: {
                kind: 'list',
                item: {
                    kind: 'object',
                    fields: { title: { kind: 'text' }, tags: { kind: 'list', item: { kind: 'text' } } }
                }
            }
        });
    });

    it('reads with blocks and dotted paths as entries, and ../ and @root as the outer values', async () => {
        const inputs = await inputsFor({
            'x.hbs':
                '{{#with author}}{{name}} {{../prefix}}{{/with}} {{owner.id}} {{#each tags}}{{@root.suffix}}{{/each}}'
        });

        expect(inputs).toEqual({
            author: { kind: 'object', fields: { name: { kind: 'text' } } },
            prefix: { kind: 'text' },
            owner: { kind: 'object', fields: { id: { kind: 'text' } } },
            tags: { kind: 'list', item: { kind: 'text' } },
            suffix: { kind: 'text' }
        });
    });

    it('asks once for a value that several files of the template read', async () => {
        const inputs = await inputsFor({
            'commands/{{pascal name}}.ts.hbs': '{{description}} {{#if ephemeral}}e{{/if}}',
            'handlers/{{pascal name}}.ts.hbs': '{{description}} {{ephemeral}}'
        });

        expect(inputs).toEqual({ description: { kind: 'text' }, ephemeral: { kind: 'text' } });
    });

    it('asks for a value that only a helper call reads, as the subject of a block or a partial', async () => {
        const inputs = await inputsFor(
            {
                '_partials/h.hbs': '{{title}}',
                'x.hbs': [
                    '{{#each (split csv)}}{{this}}{{/each}}',
                    '{{#with (split pair)}}{{this}}{{/with}}',
                    '{{> h (pascal thing)}}',
                    '{{> h title=(pascal heading)}}'
                ].join('\n')
            },
            { ...GATEWAY, helpers: { split: (value: string) => value } }
        );

        expect(inputs).toEqual({
            csv: { kind: 'text' },
            pair: { kind: 'text' },
            thing: { kind: 'text' },
            heading: { kind: 'text' }
        });
    });

    it("reads a partial's hash values as fields of the partial's own context", async () => {
        const inputs = await inputsFor({
            '_partials/card.hbs': '{{this.author.name}} {{#each items}}{{author}}{{/each}}',
            'x.hbs': '{{> card author=owner}}'
        });

        expect(inputs).toEqual({
            owner: { kind: 'object', fields: { name: { kind: 'text' } } },
            items: { kind: 'list', item: { kind: 'object', fields: { author: { kind: 'text' } } } }
        });
    });

    it("leaves the caller's block params out of a partial", async () => {
        const inputs = await inputsFor({
            '_partials/row.hbs': '{{item.name}}',
            'x.hbs': '{{#each items as |item|}}{{> row}}{{/each}}'
        });

        expect(inputs).toEqual({
            items: {
                kind: 'list',
                item: { kind: 'object', fields: { item: { kind: 'object', fields: { name: { kind: 'text' } } } } }
            }
        });
    });

    it('reads through partials, asking for what each call passes in', async () => {
        const inputs = await inputsFor({
            '_partials/header.hbs': '{{title}}',
            '_partials/footer.hbs': '{{note}} {{#if ephemeral}}e{{/if}}',
            '_partials/card.hbs': '{{name}}',
            'x.hbs': '{{> header}} {{> footer note=description}} {{> card author}}'
        });

        expect(inputs).toEqual({
            title: { kind: 'text' },
            description: { kind: 'text' },
            ephemeral: { kind: 'bool' },
            author: { kind: 'object', fields: { name: { kind: 'text' } } }
        });
    });

    it('asks for the field a quoted lookup reads', async () => {
        const inputs = await inputsFor({ 'x.hbs': '{{lookup labels "title"}}' });

        expect(inputs).toEqual({ labels: { kind: 'object', fields: { title: { kind: 'text' } } } });
    });

    it('throws when lookup reads a field picked by another value', async () => {
        await expect(inputsFor({ 'x.hbs': '{{lookup labels key}}' })).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.MakeLookupDynamicKey })
        );
    });

    it('throws MakeTemplateFailed, naming the file, when a template does not parse', async () => {
        const error = await inputsFor({ 'handlers/x.ts.hbs': '{{#if ready}}' }).catch((thrown: unknown) => thrown);

        assert(isSeedcordError(error, 'SeedcordTypeError', SeedcordErrorCode.MakeTemplateFailed));
        expect(error.message).toContain('handlers/x.ts.hbs');
    });

    it('throws MakePartialCallsItself before asking anything when a partial calls itself', async () => {
        await expect(
            inputsFor({
                '_partials/tree.hbs': '{{label}}{{#each children}}{{> tree}}{{/each}}',
                'x.hbs': '{{> tree}}'
            })
        ).rejects.toThrow(expect.objectContaining({ code: SeedcordErrorCode.MakePartialCallsItself }));
    });

    it.each([
        ['a list, then an entry', '{{#each x}}{{this}}{{/each}} {{x.name}}'],
        ['an entry, then a list', '{{x.name}} {{#each x}}{{this}}{{/each}}'],
        ['text, then an entry', '{{x}} {{x.name}}'],
        ['an entry, then text', '{{x.name}} {{x}}'],
        ['text, then a list', '{{x}} {{#each x}}{{this}}{{/each}}'],
        ['a list, then text', '{{#each x}}{{this}}{{/each}} {{x}}']
    ])('throws when one value is used as %s', async (_case, body) => {
        await expect(inputsFor({ 'x.hbs': body })).rejects.toThrow(
            expect.objectContaining({ type: 'SeedcordTypeError', code: SeedcordErrorCode.MakeValueUsedTwoWays })
        );
    });
});
