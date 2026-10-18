import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { assert, describe, it, expect } from 'vitest';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { ShellMode } from '#core/viteMode';
import { copyEdgeBotForTest } from '#tests/commands/build/edgeBot';
import { configWithGreetingPlugin, GREETING, GREETING_PROBE } from '#tests/greetingPlugin';

import { MINIMAL, openProject, projectWith, tempProject } from './projectLoaderFixtures';

describe('ProjectLoader vitePlugins', () => {
    it('throws CliConfigInvalidField that says to call a plugin factory left uncalled', async () => {
        const { load } = projectWith({ ...MINIMAL, vitePlugins: [{ name: 'json' }, function yaml() {}] });

        const caught: unknown = await load().catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.CliConfigInvalidField));
        const message = stripVTControlCharacters(caught.message);
        expect(message).toContain('vitePlugins[1]');
        expect(message).toContain('yaml()');
    });

    it('finds an uncalled factory that a promise inside a nested array resolves to', async () => {
        const { load } = projectWith({ ...MINIMAL, vitePlugins: [false, [Promise.resolve(function yaml() {})]] });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringMatching(/vitePlugins\[1\]\[0\][\s\S]*yaml\(\)/) as string
        });
    });

    it.each([['yaml'], [{ transform: () => undefined }]])(
        'throws CliConfigInvalidField for the entry %o that has no plugin name',
        async (entry) => {
            const { load } = projectWith({ ...MINIMAL, vitePlugins: [entry] });

            await expect(load()).rejects.toMatchObject({
                code: SeedcordErrorCode.CliConfigInvalidField,
                message: expect.stringContaining('vitePlugins[0]') as string
            });
        }
    );

    it('reports a bad plugin together with the other problems in the config', async () => {
        const { load } = projectWith({ ...MINIMAL, idleAnimation: 'yes', vitePlugins: ['yaml'] });

        const caught: unknown = await load().catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.CliProblems));
        expect(caught.errors).toEqual([
            expect.objectContaining({ message: expect.stringContaining('idleAnimation') as string }),
            expect.objectContaining({ message: expect.stringContaining('vitePlugins[0]') as string })
        ]);
    });

    it("runs them on a server bot's code", async () => {
        const projectDir = tempProject();
        mkdirSync(join(projectDir, 'src'));
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            configWithGreetingPlugin("root: './src', instance: './bot.ts', entry: './index.ts'")
        );
        writeFileSync(join(projectDir, 'src/probe.ts'), GREETING_PROBE);

        await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);
        const probe = await project.modules.importModule<{ default: string }>(join(projectDir, 'src/probe.ts'));

        expect(probe.default).toBe(GREETING);
    });

    it.each(['[Promise.resolve(greetingPlugin())]', '[[false, [greetingPlugin()]], null]'])(
        'runs a plugin written as %s',
        async (vitePlugins) => {
            const projectDir = tempProject();
            mkdirSync(join(projectDir, 'src'));
            writeFileSync(
                join(projectDir, 'seedcord.config.ts'),
                configWithGreetingPlugin("root: './src', instance: './bot.ts', entry: './index.ts'", vitePlugins)
            );
            writeFileSync(join(projectDir, 'src/probe.ts'), GREETING_PROBE);

            await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);
            const probe = await project.modules.importModule<{ default: string }>(join(projectDir, 'src/probe.ts'));

            expect(probe.default).toBe(GREETING);
        }
    );

    it('throws CoreVitePluginThrew with the file it was loading when a plugin throws in transform', async () => {
        const projectDir = tempProject();
        mkdirSync(join(projectDir, 'src'));
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            `export default {
    root: './src',
    instance: './bot.ts',
    entry: './index.ts',
    vitePlugins: [{ name: 'breaks-in-transform', transform: (_code, id) => { if (id.endsWith('/word.ts')) throw new Error('bad yaml on line 3'); } }]
};
`
        );
        writeFileSync(join(projectDir, 'src/word.ts'), "export const word = 'ok';\n");
        writeFileSync(join(projectDir, 'src/reexport.ts'), "export { word } from './word';\n");

        await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);

        await expect(project.modules.importModule(join(projectDir, 'src/reexport.ts'))).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreVitePluginThrew,
            message: expect.stringMatching(/breaks-in-transform[\s\S]*word\.ts/) as string
        });
    });

    it('throws CoreVitePluginThrew with the plugin and hook when a plugin throws as Vite starts', async () => {
        const projectDir = tempProject();
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            `export default {
    instance: './bot.ts',
    entry: './index.ts',
    vitePlugins: [{ name: 'breaks-on-start', config: () => { throw new Error('bad option'); } }]
};
`
        );

        const caught: unknown = await openProject(
            new ProjectLoader(openModuleLoader, new ShellMode()),
            projectDir
        ).catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        expect(caught.message).toContain('breaks-on-start');
        expect(caught.message).toContain('config');
        expect(caught.message).toContain('bad option');
    });

    it("runs them on an edge bot's code", async () => {
        const projectDir = await copyEdgeBotForTest();
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            configWithGreetingPlugin("root: './src', instance: './bot.ts'")
        );
        writeFileSync(join(projectDir, 'src/probe.ts'), GREETING_PROBE);

        await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);
        const probe = await project.modules.importModule<{ default: string }>(join(projectDir, 'src/probe.ts'));

        expect(probe.default).toBe(GREETING);
    });
});
