import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vite-plus/test';

import { copyEdgeBotForTest, edgeBuildRunner } from './edgeBot';
import { copyFixture, GATEWAY_BOT } from './fixtureCopy';
import { quickBuildRunner } from './quickBuildRunner';

import type { BuildRunner } from '#commands/build/BuildRunner';

// what a React component library ships at the top of most files
const CLIENT_MODULE = "'use client';\n\nexport const clientOnly = 1;\n";

async function warningsWhileBuilding(runner: BuildRunner, projectDir: string): Promise<string> {
    const bot = join(projectDir, 'src/bot.ts');
    await writeFile(join(projectDir, 'src/clientOnly.ts'), CLIENT_MODULE);
    await writeFile(bot, `import './clientOnly';\n${await readFile(bot, 'utf8')}`);

    using warn = vi.spyOn(console, 'warn');
    await runner.run(projectDir);
    return warn.mock.calls.flat().join('\n');
}

describe('seedcord build with a "use client" module', () => {
    it("doesn't warn about the directive in a server bot", async () => {
        const warnings = await warningsWhileBuilding(quickBuildRunner(), await copyFixture(GATEWAY_BOT));

        expect(warnings).not.toContain('use client');
    }, 120_000);

    it("doesn't warn about the directive in an edge bot", async () => {
        const warnings = await warningsWhileBuilding(edgeBuildRunner(), await copyEdgeBotForTest());

        expect(warnings).not.toContain('use client');
    }, 120_000);
});
