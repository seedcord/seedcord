import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished } from 'vitest';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { EdgeDevRuntime } from '#commands/dev/runtime/EdgeDevRuntime';
import { toSeedcordInstance } from '#core/modules/importInstance';
import { quietSteps } from '#core/output/quietSteps';
import { copyEdgeBotForTest } from '#tests/commands/build/edgeBot';
import { ED25519_KEY_BYTES, FAKE_TOKEN } from '#tests/commands/build/smoke';
import { silentLogger } from '#tests/silentLogger';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { SeedcordInstance } from '@seedcord/types/internal';

function edgeConfig(projectDir: string): ResolvedSeedcordConfig {
    // justified: the runtime reads only these fields
    return {
        configFile: join(projectDir, 'seedcord.config.ts'),
        root: join(projectDir, 'src'),
        instance: join(projectDir, 'src/bot.ts'),
        target: { kind: 'edge', wranglerConfig: join(projectDir, 'wrangler.jsonc') },
        build: { outDir: join(projectDir, 'dist') }
    } as ResolvedSeedcordConfig;
}

const liveVars = { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: 'ab'.repeat(ED25519_KEY_BYTES) };

const WAVE_COMMAND = `import { BuilderComponent, RegisterCommand } from '@seedcord/http';

@RegisterCommand('global')
export class Wave extends BuilderComponent<'command'> {
    constructor() {
        super('command');
        this.instance.setName('wave').setDescription('Waves back');
    }
}
`;

async function editFile(path: string, edit: (text: string) => string): Promise<void> {
    await writeFile(path, edit(await readFile(path, 'utf8')));
}

// wrangler reads .dev.vars beside the wrangler config into the worker's env
async function writeDevVars(projectDir: string, vars: Record<string, string>): Promise<void> {
    const lines = Object.entries(vars).map(([key, value]) => `${key}=${value}\n`);
    await writeFile(join(projectDir, '.dev.vars'), lines.join(''));
}

async function startedRuntime(projectDir: string): Promise<{ runtime: EdgeDevRuntime; instance: SeedcordInstance }> {
    const config = edgeConfig(projectDir);
    const runtime = new EdgeDevRuntime({ kind: 'edge', wranglerConfig: join(projectDir, 'wrangler.jsonc') });
    onTestFinished(() => runtime.dispose());
    await runtime.start({ config });
    const { module } = await runtime.loadEntry();
    return { runtime, instance: toSeedcordInstance(await resolveDefaultExport(module), config.instance) };
}

describe('EdgeDevRuntime', () => {
    it('starts the bot in workerd when the session asks', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const { runtime, instance } = await startedRuntime(projectDir);

        await expect(runtime.startBot(instance)).resolves.not.toThrow();
    }, 120_000);

    it('rejects with the error the worker failed to start with', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, { DISCORD_PUBLIC_KEY: 'ab'.repeat(ED25519_KEY_BYTES) });
        const { runtime, instance } = await startedRuntime(projectDir);

        await expect(runtime.startBot(instance)).rejects.toHaveProperty('code', SeedcordErrorCode.ConfigMissingEnv);
    }, 120_000);

    it('settles a start that is still running when the session stops', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const { runtime, instance } = await startedRuntime(projectDir);

        const starting = runtime.startBot(instance);
        await runtime.stopBot();

        await expect(starting).resolves.toBeUndefined();
    }, 120_000);

    it('starts a fresh worker for the next session after a stop', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const first = await startedRuntime(projectDir);
        await first.runtime.startBot(first.instance);
        await first.runtime.stopBot();
        await first.runtime.dispose();

        const second = await startedRuntime(projectDir);

        await expect(second.runtime.startBot(second.instance)).resolves.not.toThrow();
    }, 120_000);

    it('gives codegen a node copy of the bot that scans its commands', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text.replace('commands: { path: null }', "commands: { path: './commands' }")
        );
        await mkdir(join(projectDir, 'src/commands'));
        await writeFile(join(projectDir, 'src/commands/Wave.ts'), WAVE_COMMAND);
        const { runtime, instance } = await startedRuntime(projectDir);
        const config = edgeConfig(projectDir);

        const { outputPath } = await CodegenRunner.create(quietSteps, silentLogger).writeFrom({
            config,
            instance,
            modules: runtime
        });

        await expect(readFile(outputPath, 'utf8')).resolves.toContain('wave');
    }, 120_000);

    it('exports the durable object classes bot.ts exports', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        await appendFile(
            join(projectDir, 'src/bot.ts'),
            "\nimport { DurableObject } from 'cloudflare:workers';\nexport class Counter extends DurableObject {}\n"
        );
        await editFile(join(projectDir, 'wrangler.jsonc'), (text) =>
            text.replace(
                '"compatibility_date"',
                '"durable_objects": { "bindings": [{ "name": "COUNTER", "class_name": "Counter" }] },\n    "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Counter"] }],\n    "compatibility_date"'
            )
        );
        const { runtime, instance } = await startedRuntime(projectDir);

        await expect(runtime.startBot(instance)).resolves.not.toThrow();
    }, 120_000);
});
