import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { linkPackages } from '#tests/edgeFolder';

import { devContextFor } from './devConfigFor';
import { saveUntil } from './saveUntil';

// a plain ServerHost runs the real reload path without a Discord bot
const botFile = (loadsWeb: string): string => `import { REST } from '@discordjs/rest';
import { CoordinatedShutdown, CoordinatedStartup, ServerHost } from '@seedcord/core/node';

${loadsWeb}

class Bot extends ServerHost {
    config = { server: { port: false } };
    rest = new REST();
    applicationId = 'app-1';

    constructor() {
        super('gateway', new CoordinatedShutdown(), new CoordinatedStartup(), undefined);
    }

    run() {
        return this.init();
    }
}

export const bot = new Bot().attach('web', Web);
await bot.run();
`;

const webPlugin = (version: string): string => `import { Plugin } from '@seedcord/core/plugin';

export class Web extends Plugin {
    version = '${version}';

    init() {}
}
`;

interface ReloadingBot extends AsyncDisposable {
    readonly web: { readonly version: string };
}

describe('dev runtime on a node bot', () => {
    it.each([
        ['an import', "import { Web } from './Web';"],
        ['await import()', "const { Web } = await import('./Web');"]
    ])(
        "runs a plugin's new code after you save its file when the bot file loads it with %s",
        async (_how, loadsWeb) => {
            await using project = await mkdtempDisposable(join(tmpdir(), 'seedcord-dev-reload-'));
            const src = join(project.path, 'src');
            await mkdir(src, { recursive: true });
            await linkPackages(project.path, ['@seedcord', '@discordjs', 'envapt']);
            await writeFile(join(project.path, 'package.json'), JSON.stringify({ name: 'bot', type: 'module' }));
            await writeFile(join(project.path, 'seedcord.config.ts'), 'export default {};\n');
            await writeFile(join(src, 'bot.ts'), botFile(loadsWeb));
            await writeFile(join(src, 'Web.ts'), webPlugin('before'));

            const runtime = new ServerDevRuntime();
            await using _runtime = { [Symbol.asyncDispose]: () => runtime.stop() };
            await runtime.start(devContextFor(project.path, 'bot.ts'));
            const { module } = await runtime.loadEntry();
            // justified: botFile() above exports a ServerHost, which disposes itself, with a Web plugin at web
            await using bot = (module as { bot: ReloadingBot }).bot;
            expect(bot.web.version).toBe('before');

            await saveUntil(join(src, 'Web.ts'), webPlugin('after'), () => expect(bot.web.version).toBe('after'));
        },
        60_000
    );
});
