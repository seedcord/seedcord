import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it, onTestFinished, vi } from 'vitest';

import { Template } from '#src/Template';
import { templateFolder } from '#tests/templateFolder';

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
const GATEWAY: RenderProject = { root: ROOT, transport: 'gateway', runtime: 'server', helpers: {} };

async function onlyTemplate(files: Record<string, string>): Promise<AsyncDisposable & { template: Template }> {
    const folder = await templateFolder(
        Object.fromEntries(Object.entries(files).map(([path, body]) => [`T/${path}`, body]))
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

    it('fills the transport variables from the project', async () => {
        await using made = await onlyTemplate({ 'x.hbs': '{{transport}} {{isGateway}} {{isEdge}}' });
        const edge: RenderProject = { ...GATEWAY, transport: 'http', runtime: 'edge' };

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

    it('stamps a file name with the time in UTC, largest unit first', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        onTestFinished(() => {
            vi.useRealTimers();
        });
        vi.setSystemTime(new Date('2026-10-27T15:30:05Z'));
        await using made = await onlyTemplate({ 'migrations/{{timestamp}}_{{snake name}}.ts.hbs': '' });

        const [file] = made.template.output('GuildSettings', GATEWAY).render({});

        expect(file?.path).toBe(join(ROOT, 'migrations/20261027153005_guild_settings.ts'));
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

    it.each(['', '2fast', 'roll!dice', 'tickets/', '../Appeal', '/Appeal', 'a//Appeal', 'a/./Appeal'])(
        'rejects %j as a name before any path is built',
        async (name) => {
            await using made = await onlyTemplate({ 'x.hbs': '' });

            expect(() => made.template.output(name, GATEWAY)).toThrow(
                expect.objectContaining({ type: 'SeedcordTypeError', code: SeedcordErrorCode.MakeInvalidName })
            );
        }
    );

    it.each(['roll dice', 'roll-dice', 'roll_dice', 'RollDice2', 'tickets/Appeal', 'a/b/Appeal'])(
        'accepts %j as a name',
        async (name) => {
            await using made = await onlyTemplate({ 'x.hbs': '' });

            expect(() => made.template.output(name, GATEWAY)).not.toThrow();
        }
    );

    it('throws when a template reads a value it was never given', async () => {
        await using made = await onlyTemplate({ 'x.hbs': '[{{description}}]' });

        expect(() => made.template.output('A', GATEWAY).render({})).toThrow(/description/);
    });
});
