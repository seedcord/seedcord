import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildContext } from '@src/template/context';
import { renderTemplates } from '@src/template/render';

import type { ScaffoldAnswers } from '@src/template/context';

const TEMPLATES = resolve(import.meta.dirname, '../../templates');
const EXTRAS = { developerUsername: 'dhruv', runCommand: 'pnpm run' };

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    language: 'typescript',
    transport: 'gateway',
    capabilities: ['reactions'],
    token: 'aaa.bbb.ccc',
    botColor: 'Blurple'
};

const HTTP: ScaffoldAnswers = {
    directory: 'my-bot',
    language: 'typescript',
    transport: 'http',
    token: 'aaa.bbb.ccc',
    publicKey: 'a'.repeat(64),
    botColor: 'Blurple'
};

async function render(answers: ScaffoldAnswers): Promise<Map<string, string>> {
    const files = await renderTemplates(TEMPLATES, buildContext(answers, EXTRAS));
    return new Map(files.map((file) => [file.path, file.contents]));
}

async function renderOne(answers: ScaffoldAnswers, path: string): Promise<string> {
    const files = await render(answers);
    return files.get(path) ?? '';
}

describe('renderTemplates', () => {
    it('drops the .hbs extension', async () => {
        const files = await render(GATEWAY);

        expect([...files.keys()].filter((path) => path.endsWith('.hbs'))).toEqual([]);
    });

    it('restores the leading dot on the three files npm would drop', async () => {
        const files = await render(GATEWAY);

        expect(files.has('.env')).toBe(true);
        expect(files.has('.gitignore')).toBe(true);
        expect(files.has('.prettierignore')).toBe(true);
    });

    it('keeps nested paths', async () => {
        const files = await render(GATEWAY);

        expect(files.has('src/commands/Ping.ts')).toBe(true);
        expect(files.has('src/handlers/Ping.ts')).toBe(true);
    });

    it('gives http every file except the events one', async () => {
        const gateway = await render(GATEWAY);
        const http = await render(HTTP);
        const onlyOnGateway = [...gateway.keys()].filter((path) => !http.has(path));

        expect(onlyOnGateway).toEqual(['src/events/Ready.ts']);
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

    it('writes the public key into the env file', async () => {
        const env = await renderOne(HTTP, '.env');

        expect(env).toContain(`DISCORD_PUBLIC_KEY=${'a'.repeat(64)}`);
    });

    it('leaves the public key out on gateway', async () => {
        const env = await renderOne(GATEWAY, '.env');

        expect(env).not.toContain('DISCORD_PUBLIC_KEY');
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
