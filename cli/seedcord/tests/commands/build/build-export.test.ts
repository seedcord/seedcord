import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { build } from 'vite';
import { describe, expect, it } from 'vitest';

import { targetBuildFor } from '#commands/build/builder/targetBuildFor';
import { runProjectTsc } from '#core/modules/runProjectTsc';
import { ShellMode } from '#core/viteMode';

import { copyFixture, GATEWAY_BOT, HTTP_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';
import { smoke } from './smoke';

import type { BuildStep } from '#commands/build/BuildRunner';
import type { Steps } from '#core/output/Steps';

const EXPORT_CONFIG = `export default {
    root: './src',
    instance: './bot.ts'
};
`;

const FETCH_SERVER = `import { createServer } from 'node:http';

import bot from './dist/index.mjs';

await bot.start();

const server = createServer(async (incoming, outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const request = new Request(\`http://localhost\${incoming.url}\`, {
        method: incoming.method,
        headers: incoming.headers,
        body: Buffer.concat(chunks)
    });
    const response = await bot.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
});
server.listen(0, () => console.log(\`fixture:listening \${server.address().port}\`));
`;

const GATEWAY_SCRIPT = `import bot from './dist/index.mjs';

await bot.start();
`;

const SEEDCORD_FIRST_SCRIPT = `import '@seedcord/gateway';

const { default: bot } = await import('./dist/index.mjs');
await bot.start();
`;

const TYPED_APP = `import bot from './dist/index.mjs';

await bot.start();
const response: Response = await bot.fetch(new Request('http://localhost/'));
console.log(response.status);
// @ts-expect-error the bot's type has no such member
console.log(bot.notAMember);
`;

const APP_TSC_FLAGS = [
    '--ignoreConfig',
    '--noEmit',
    '--strict',
    '--module',
    'nodenext',
    '--target',
    'es2022',
    '--skipLibCheck'
];

async function exportProject(fixture: string, script: string): Promise<string> {
    const projectDir = await copyFixture(fixture);
    await writeFile(join(projectDir, 'seedcord.config.ts'), EXPORT_CONFIG);
    await writeFile(join(projectDir, 'server.mjs'), script);
    return projectDir;
}

async function builtHttpExport(): Promise<string> {
    const projectDir = await exportProject(HTTP_BOT, FETCH_SERVER);
    const botFile = join(projectDir, 'src/bot.ts');
    const source = await readFile(botFile, 'utf8');
    await writeFile(botFile, source.replace('port: 0', 'port: false'));
    await quickBuildRunner().run(projectDir);
    return projectDir;
}

describe('seedcord build without build.start', () => {
    it("serves an http bot through the fetch of a plain node server's own port", async () => {
        const projectDir = await builtHttpExport();

        const output = await smoke('http', process.execPath, [join(projectDir, 'server.mjs')]);

        expect(output).toContain('fixture:text hello from the text table');
    }, 120_000);

    it('still loads its folders once a bundler leaves import.meta.dirname undefined', async () => {
        const projectDir = await builtHttpExport();
        const outDir = join(projectDir, 'bundled');
        await build({
            configFile: false,
            logLevel: 'silent',
            define: { 'import.meta.dirname': 'undefined' },
            build: { ssr: join(projectDir, 'server.mjs'), outDir }
        });

        const output = await smoke('http', process.execPath, [join(outDir, 'server.js')]);

        expect(output).toContain('fixture:text hello from the text table');
    }, 120_000);

    it('types the default export of dist/index.mjs for an app that imports it', async () => {
        const projectDir = await builtHttpExport();
        await writeFile(join(projectDir, 'app.mts'), TYPED_APP);

        const result = await runProjectTsc(projectDir, [...APP_TSC_FLAGS, 'app.mts']);

        expect(result.stdout + result.stderr).toBe('');
        expect(result.exitCode).toBe(0);
    }, 120_000);

    it('writes the types in a step after the bundle', async () => {
        const projectDir = await exportProject(GATEWAY_BOT, GATEWAY_SCRIPT);
        const labels: string[] = [];
        const recording: Steps<BuildStep> = {
            step: (label, task) => {
                labels.push(label);
                return task();
            },
            detail: () => undefined
        };

        await quickBuildRunner(targetBuildFor, new ShellMode(), recording).run(projectDir);

        expect(labels.slice(-2)).toEqual(['bundle', 'write types']);
    }, 120_000);

    it('reads the .env beside the config when the app imports seedcord before the bot', async () => {
        const projectDir = await exportProject(GATEWAY_BOT, SEEDCORD_FIRST_SCRIPT);
        await quickBuildRunner().run(projectDir);

        const output = await smoke('gateway', process.execPath, [join(projectDir, 'server.mjs')]);

        expect(output).toContain('fixture:env beside the config');
    }, 120_000);

    it('reads the .env beside the config when a plain node script imports the bot', async () => {
        const projectDir = await exportProject(GATEWAY_BOT, GATEWAY_SCRIPT);
        await quickBuildRunner().run(projectDir);

        const output = await smoke('gateway', process.execPath, [join(projectDir, 'server.mjs')]);

        expect(output).toContain('fixture:env beside the config');
    }, 120_000);
});
