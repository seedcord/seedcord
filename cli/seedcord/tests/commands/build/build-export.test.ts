import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { build } from 'vite';
import { describe, expect, it } from 'vitest';

import { copyFixture, GATEWAY_BOT, HTTP_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';
import { smoke } from './smoke';

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

    it('gives a plain node script a gateway bot that loads its handlers and its .env', async () => {
        const projectDir = await exportProject(GATEWAY_BOT, GATEWAY_SCRIPT);
        await quickBuildRunner().run(projectDir);

        const output = await smoke('gateway', process.execPath, [join(projectDir, 'server.mjs')]);

        expect(output).toContain('fixture:env beside the config');
    }, 120_000);
});
