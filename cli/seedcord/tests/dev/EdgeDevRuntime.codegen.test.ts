import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { quietSteps } from '#core/output/quietSteps';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { ShellMode } from '#core/viteMode';
import { silentLogger } from '#tests/silentLogger';

import { edgeConfig, edgeProject, editFile, fakeDiscordApi, startedRuntime, WAVE_COMMAND } from './edgeDevRuntime';

import type { DevEvent } from '#commands/dev/runtime/events';

describe('EdgeDevRuntime codegen', () => {
    it('gives codegen a node copy of the bot that scans its commands, then the saved version of a file they import', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text.replace('commands: { path: null }', "commands: { path: './commands' }")
        );
        await mkdir(join(projectDir, 'src/commands'));
        const names = join(projectDir, 'src/names.ts');
        await writeFile(names, "export const WAVE = 'wave';\n");
        await writeFile(
            join(projectDir, 'src/commands/Wave.ts'),
            `import { WAVE } from '../names';\n${WAVE_COMMAND.replace("setName('wave')", 'setName(WAVE)')}`
        );
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;
        const codegen = CodegenRunner.create(quietSteps, silentLogger, new ShellMode());
        const config = edgeConfig(projectDir);
        const bot = { config, files: new ProjectFiles(config), instance, modules: runtime };
        const { outputPath: first } = await codegen.writeFrom(bot);
        await expect(readFile(first, 'utf8')).resolves.toContain('wave');

        await writeFile(names, "export const WAVE = 'salute';\n");

        await vi.waitFor(
            async () => {
                const { outputPath } = await codegen.writeFrom(bot);
                await expect(readFile(outputPath, 'utf8')).resolves.toContain('salute');
            },
            { timeout: 20_000, interval: 500 }
        );
    }, 120_000);

    it('prompts for a saved command and deploys it once the session says so', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const discord = await fakeDiscordApi();
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text
                .replace(
                    'bot: { interactions:',
                    `bot: { restOptions: { api: '${discord.api}' }, commands: { path: './commands' }, interactions:`
                )
                .replace(', commands: { path: null }', '')
        );
        await mkdir(join(projectDir, 'src/commands'));
        const command = join(projectDir, 'src/commands/Wave.ts');
        await writeFile(command, WAVE_COMMAND);
        const events: DevEvent[] = [];
        await using started = await startedRuntime(projectDir, (event) => events.push(event));
        const { runtime, instance } = started;
        await runtime.startBot(instance);

        await editFile(command, (text) => text.replace("setName('wave')", "setName('salute')"));
        await vi.waitFor(() => {
            expect(events).toContainEqual(expect.objectContaining({ type: 'command-update-prompt' }));
        });
        runtime.refreshCommands(true);

        await vi.waitFor(() => {
            expect(discord.deployedNames).toEqual([['wave'], ['salute']]);
        });
    }, 120_000);
});
