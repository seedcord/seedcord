import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { Template } from '@seedcord/cli-templates';
import { describe, expect, it } from 'vitest';

import { buildContext } from '#template/context';
import { copyStarters, renderTemplates } from '#template/render';
import { BOT_TOKEN } from '#tests/token';

import type { ScaffoldAnswers } from '#template/context';
import type { InputShape } from '@seedcord/cli-templates';

const TEMPLATES = resolve(import.meta.dirname, '../../templates');
const STARTERS = resolve(import.meta.dirname, '../../starters');
const EXTRAS = { developerUsername: 'dhruv', agent: 'pnpm' } as const;

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'gateway',
    capabilities: ['reactions'],
    token: BOT_TOKEN,
    testingGuilds: [],
    botColor: 'Blurple',
    install: true,
    git: true
};

const HTTP: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'http',
    runtime: 'server',
    token: BOT_TOKEN,
    testingGuilds: [],
    botColor: 'Blurple',
    install: true,
    git: true
};

const EDGE: ScaffoldAnswers = { ...HTTP, runtime: 'edge' };

async function render(answers: ScaffoldAnswers): Promise<Map<string, string>> {
    const files = await renderTemplates(TEMPLATES, buildContext(answers, EXTRAS));
    return new Map(files.map((file) => [file.path, file.contents]));
}

async function renderOne(answers: ScaffoldAnswers, path: string): Promise<string> {
    const files = await render(answers);
    const contents = files.get(path);
    // an empty string would satisfy every not.toContain below
    if (contents === undefined) throw new Error(`${path} was never rendered`);

    return contents;
}

async function scriptsOf(answers: ScaffoldAnswers): Promise<Record<string, string | undefined>> {
    const manifest = JSON.parse(await renderOne(answers, 'package.json')) as { scripts: Record<string, string> };
    return manifest.scripts;
}

describe('renderTemplates', () => {
    it('writes a bunfig.toml that runs the cli on Bun for a Bun project', async () => {
        const files = await renderTemplates(TEMPLATES, buildContext(GATEWAY, { ...EXTRAS, agent: 'bun' }));

        expect(files.find((file) => file.path === 'bunfig.toml')?.contents).toBe('[run]\nbun = true\n');
    });

    it('writes a pnpm-workspace.yaml that ignores unrs-resolver scripts for a pnpm project', async () => {
        const files = await renderTemplates(TEMPLATES, buildContext(GATEWAY, { ...EXTRAS, agent: 'pnpm' }));

        expect(files.find((file) => file.path === 'pnpm-workspace.yaml')?.contents).toBe(
            'allowBuilds:\n    unrs-resolver: false\n'
        );
    });

    it("declares this package's Bun floor for a Bun project and its Node floor for the rest", async () => {
        const own = createRequire(import.meta.url)('../../package.json') as {
            engines: { node: string; bun: string };
        };

        const engines = async (agent: 'bun' | 'pnpm'): Promise<unknown> => {
            const files = await renderTemplates(TEMPLATES, buildContext(GATEWAY, { ...EXTRAS, agent }));
            const manifest = files.find((file) => file.path === 'package.json')?.contents ?? '{}';
            return (JSON.parse(manifest) as { engines?: unknown }).engines;
        };

        expect(await engines('bun')).toEqual({ bun: own.engines.bun });
        expect(await engines('pnpm')).toEqual({ node: own.engines.node });
    });

    it('runs the cli of an edge bot on Node in a Bun project', async () => {
        const own = createRequire(import.meta.url)('../../package.json') as { engines: { node: string } };
        const files = await renderTemplates(TEMPLATES, buildContext(EDGE, { ...EXTRAS, agent: 'bun' }));
        const manifest = files.find((file) => file.path === 'package.json')?.contents ?? '{}';

        expect(files.find((file) => file.path === 'bunfig.toml')).toBeUndefined();
        expect((JSON.parse(manifest) as { engines?: unknown }).engines).toEqual({ node: own.engines.node });
    });

    it.each(['npm', 'yarn', 'pnpm'] as const)('writes no bunfig.toml for %s projects', async (agent) => {
        const files = await renderTemplates(TEMPLATES, buildContext(GATEWAY, { ...EXTRAS, agent }));

        expect(files.find((file) => file.path === 'bunfig.toml')).toBeUndefined();
    });

    it.each(['npm', 'yarn', 'bun'] as const)('writes no pnpm-workspace.yaml for %s projects', async (agent) => {
        const files = await renderTemplates(TEMPLATES, buildContext(GATEWAY, { ...EXTRAS, agent }));

        expect(files.find((file) => file.path === 'pnpm-workspace.yaml')).toBeUndefined();
    });

    it('drops the .hbs extension', async () => {
        const files = await render(GATEWAY);

        expect([...files.keys()].filter((path) => path.endsWith('.hbs'))).toEqual([]);
    });

    it('restores the leading dot on the three files npm would drop', async () => {
        const files = await render(GATEWAY);

        expect(files.has('.env')).toBe(true);
        expect(files.has('.gitattributes')).toBe(true);
        expect(files.has('.gitignore')).toBe(true);
        expect(files.has('.prettierignore')).toBe(true);
    });

    it('keeps nested paths', async () => {
        const files = await render(GATEWAY);

        expect(files.has('src/commands/Ping.ts')).toBe(true);
        expect(files.has('src/handlers/Ping.ts')).toBe(true);
    });

    it('recommends the eslint and prettier extensions', async () => {
        const files = await render(GATEWAY);
        const recommendations = files.get('.vscode/extensions.json') ?? '';

        expect(recommendations).toContain('dbaeumer.vscode-eslint');
        expect(recommendations).toContain('esbenp.prettier-vscode');
    });

    it('gives http every file except the events one', async () => {
        const gateway = await render(GATEWAY);
        const http = await render(HTTP);
        const onlyOnGateway = [...gateway.keys()].filter((path) => !http.has(path));

        expect(onlyOnGateway).toEqual(['src/events/Ready.ts']);
    });
});

type Answers = Parameters<ReturnType<Template['output']>['render']>[0];

function sampleOf(shape: InputShape): Answers[string] {
    if (shape.kind === 'text') return 'Sample';
    if (shape.kind === 'bool') return true;
    if (shape.kind === 'list') return [sampleOf(shape.item)];
    return Object.fromEntries(Object.entries(shape.fields).map(([key, field]) => [key, sampleOf(field)]));
}

describe('the starters', () => {
    it('go into templates/ unrendered, with the gateway starters on gateway only', async () => {
        const gateway = await copyStarters(STARTERS, buildContext(GATEWAY, EXTRAS));
        const http = await copyStarters(STARTERS, buildContext(HTTP, EXTRAS));
        const sourceOf = (group: string, path: string): Promise<string> =>
            readFile(join(STARTERS, group, path.replace(/^templates\//, '')), 'utf8');
        const event = 'templates/Event/events/{{pascal name}}.ts.hbs';

        for (const file of http) expect(file.contents).toBe(await sourceOf('shared', file.path));
        expect(gateway).toEqual([...http, { path: event, contents: await sourceOf('gateway', event) }]);
    });

    it('each render with seedcord make from the answers it asks for', async () => {
        const project = { root: '/bot/src', transport: '@seedcord/gateway', runtime: 'server', helpers: {} } as const;
        const groups = await Promise.all(
            ['shared', 'gateway'].map((group) => Template.readAll(join(STARTERS, group), ''))
        );

        for (const template of groups.flat()) {
            const output = template.output('roll dice', project);
            const answers = sampleOf({ kind: 'object', fields: output.inputs() }) as Answers;

            expect(() => output.render(answers), template.name).not.toThrow();
        }
    });
});

describe('the agent instructions', () => {
    it('warns that seedcord is absent from training data', async () => {
        const agents = await renderOne(GATEWAY, 'AGENTS.md');

        expect(agents).toContain('no presence in your training data');
    });

    it('sends an agent to the index and to a page markdown url', async () => {
        const agents = await renderOne(HTTP, 'AGENTS.md');

        expect(agents).toContain('https://seedcord.org/guide/llms.txt');
        expect(agents).toContain('https://seedcord.org/guide/commands/options.md');
    });

    it('names the transport this project picked', async () => {
        expect(await renderOne(GATEWAY, 'AGENTS.md')).toContain('`@seedcord/gateway`');
        expect(await renderOne(HTTP, 'AGENTS.md')).toContain('`@seedcord/http`');
    });

    it('lists the events folder on gateway alone', async () => {
        expect(await renderOne(GATEWAY, 'AGENTS.md')).toContain('`src/events/`');
        expect(await renderOne(HTTP, 'AGENTS.md')).not.toContain('`src/events/`');
    });

    it('spells the commands with the package manager the scaffold picked', async () => {
        expect(await renderOne(GATEWAY, 'AGENTS.md')).toContain('pnpm run codegen');
    });

    // a symlink here breaks on a windows checkout
    it('points CLAUDE.md at the same file', async () => {
        const claude = await renderOne(GATEWAY, 'CLAUDE.md');

        expect(claude.trim()).toBe('@AGENTS.md');
    });
});

describe('the sample event handler', () => {
    it('replies to a mention once a message capability is picked', async () => {
        const files = await render({ ...GATEWAY, capabilities: ['guild-messages'] });

        expect(files.has('src/events/Mentioned.ts')).toBe(true);
        expect(files.has('src/events/Ready.ts')).toBe(false);
    });

    it('falls back to the boot handler for any other capability', async () => {
        const files = await render(GATEWAY);

        expect(files.has('src/events/Ready.ts')).toBe(true);
        expect(files.has('src/events/Mentioned.ts')).toBe(false);
    });

    it('ships the boot handler even when nothing was picked', async () => {
        const files = await render({ ...GATEWAY, capabilities: [] });

        expect(files.has('src/events/Ready.ts')).toBe(true);
    });

    it('writes neither on http', async () => {
        const files = await render(HTTP);

        expect(files.has('src/events/Ready.ts')).toBe(false);
        expect(files.has('src/events/Mentioned.ts')).toBe(false);
    });
});

describe('the rendered gateway config', () => {
    it('imports the gateway package and its intents', async () => {
        const bot = await renderOne(GATEWAY, 'src/bot.ts');

        expect(bot).toContain("from '@seedcord/gateway'");
        expect(bot).toContain('GatewayIntentBits.Guilds');
        expect(bot).toContain('GatewayIntentBits.GuildMessageReactions');
        expect(bot).toContain('Partials.Reaction');
    });

    it('always points events at the directory', async () => {
        const bot = await renderOne({ ...GATEWAY, capabilities: [] }, 'src/bot.ts');

        expect(bot).toContain("'./events'");
    });
});

describe('the rendered http config', () => {
    it('imports the http package and declares no intents', async () => {
        const bot = await renderOne(HTTP, 'src/bot.ts');

        expect(bot).toContain("from '@seedcord/http'");
        expect(bot).not.toContain('GatewayIntentBits');
        expect(bot).not.toContain('clientOptions');
    });

    it('writes the test servers you gave into .env', async () => {
        const env = await renderOne({ ...HTTP, testingGuilds: ['613425648685547541', '1100000000000000000'] }, '.env');

        expect(env).toMatch(/^TESTING_GUILD_IDS=613425648685547541,1100000000000000000$/m);
    });

    it('writes an empty DISCORD_BOT_TOKEN when you skipped the token', async () => {
        const env = await renderOne({ ...HTTP, token: null }, '.env');

        expect(env).toMatch(/^DISCORD_BOT_TOKEN=$/m);
    });
});

describe('the rendered edge project', () => {
    it('writes a cloudflare.config.ts and no entry file', async () => {
        const files = await render(EDGE);

        expect(files.has('cloudflare.config.ts')).toBe(true);
        expect(files.has('src/index.ts')).toBe(false);
    });

    it('writes no cloudflare.config.ts for a server bot', async () => {
        const files = await render(HTTP);

        expect(files.has('cloudflare.config.ts')).toBe(false);
    });

    it('writes build.start for a node bot and leaves it out on edge', async () => {
        expect(await renderOne(EDGE, 'seedcord.config.ts')).not.toContain('start:');
        expect(await renderOne(HTTP, 'seedcord.config.ts')).toContain("build: { start: './index.ts' }");
    });

    it("points TypeScript at the worker's build condition and the types cf writes", async () => {
        const tsconfig = JSON.parse(await renderOne(EDGE, 'tsconfig.json')) as {
            compilerOptions: { customConditions?: string[] };
            include: string[];
        };

        expect(tsconfig.compilerOptions.customConditions).toEqual(['workerd']);
        expect(tsconfig.include).toContain('cloudflare.config.ts');
        expect(tsconfig.include).toContain('.cloudflare/types/index.d.ts');
    });

    it.each([GATEWAY, HTTP, EDGE])("types import.meta.env and keeps node's types", async (answers) => {
        const tsconfig = JSON.parse(await renderOne(answers, 'tsconfig.json')) as {
            compilerOptions: { types?: string[] };
        };

        expect(tsconfig.compilerOptions.types).toEqual(['node', 'vite/client']);
    });

    it("lets pnpm run workerd's install script", async () => {
        expect(await renderOne(EDGE, 'pnpm-workspace.yaml')).toBe(
            'allowBuilds:\n    unrs-resolver: false\n    workerd: true\n'
        );
    });

    it('gives an edge bot deploy and types scripts and nothing to start', async () => {
        const scripts = await scriptsOf(EDGE);

        expect(Object.keys(scripts)).toEqual(expect.arrayContaining(['deploy', 'types', 'postinstall']));
        expect(scripts.start).toBeUndefined();
    });
});

describe('the rendered scripts', () => {
    it.each([
        ['gateway', GATEWAY],
        ['http', HTTP],
        ['edge', EDGE]
    ])('give the %s bot commands scripts and a check that runs only scripts it has', async (_kind, answers) => {
        const scripts = await scriptsOf(answers);
        const checked = (scripts.check ?? '').split('&&').map((step) => step.trim().replace(/^pnpm run /, ''));

        expect(Object.keys(scripts)).toEqual(expect.arrayContaining(['commands', 'commands:deploy']));
        expect(checked.length).toBeGreaterThan(1);
        for (const name of checked) expect(scripts[name], name).toBeDefined();
    });
});

describe('escaping', () => {
    it('leaves an apostrophe in a git user name alone', async () => {
        const files = await renderTemplates(
            TEMPLATES,
            buildContext(GATEWAY, { ...EXTRAS, developerUsername: "Conor O'Brien" })
        );
        const bot = files.find((file) => file.path === 'src/bot.ts')?.contents ?? '';

        expect(bot).toContain("O'Brien");
        expect(bot).not.toContain('&#x27;');
    });
});
