import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { assert, describe, it, expect, onTestFinished } from 'vitest';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { ShellMode } from '#core/viteMode';
import { copyEdgeBotForTest } from '#tests/commands/build/edgeBot';
import { configWithGreetingPlugin, GREETING, GREETING_PROBE } from '#tests/greetingPlugin';

import { MINIMAL, openProject, stubModulesExporting, tempProject } from './projectLoaderFixtures';

import type { OpenModules } from '#core/modules/ModuleLoader';
import type { StubModules } from './projectLoaderFixtures';

describe('ProjectLoader vitePlugins', () => {
    it("runs them on a server bot's code", async () => {
        const projectDir = tempProject();
        mkdirSync(join(projectDir, 'src'));
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            configWithGreetingPlugin("root: './src', instance: './bot.ts', build: { start: './index.ts' }")
        );
        writeFileSync(join(projectDir, 'src/probe.ts'), GREETING_PROBE);

        await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);
        const probe = await project.modules.importModule<{ default: string }>(join(projectDir, 'src/probe.ts'));

        expect(probe.default).toBe(GREETING);
    });

    it('calls vitePlugins once for the one Vite server a project opens', async () => {
        const projectDir = tempProject();
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            `export default { instance: './bot.ts', build: { start: './index.ts' }, vitePlugins: () => { globalThis.vitePluginsCalls = (globalThis.vitePluginsCalls ?? 0) + 1; return []; } };\n`
        );
        onTestFinished(() => {
            Reflect.deleteProperty(globalThis, 'vitePluginsCalls');
        });

        await using _project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);

        expect(Reflect.get(globalThis, 'vitePluginsCalls')).toBe(1);
    });

    it('runs a local plugin whose hook imports a file lazily', async () => {
        const projectDir = tempProject();
        mkdirSync(join(projectDir, 'src'));
        mkdirSync(join(projectDir, 'plugins'));
        writeFileSync(join(projectDir, 'plugins/word.ts'), "export const word = 'hi from a lazy import';\n");
        writeFileSync(
            join(projectDir, 'plugins/lazy.ts'),
            `export function lazy() {
    return {
        name: 'lazy',
        async load(id: string) {
            if (!id.endsWith('/probe.ts')) return undefined;
            const { word } = await import('./word');
            return \`export default \${JSON.stringify(word)};\`;
        }
    };
}
`
        );
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            `import { lazy } from './plugins/lazy';\n\nexport default { root: './src', instance: './bot.ts', build: { start: './index.ts' }, vitePlugins: () => [lazy()] };\n`
        );
        writeFileSync(join(projectDir, 'src/probe.ts'), 'export default undefined;\n');

        await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);
        const probe = await project.modules.importModule<{ default: string }>(join(projectDir, 'src/probe.ts'));

        expect(probe.default).toBe('hi from a lazy import');
    });

    it('runs a plugin from a package whose hook imports a file lazily', async () => {
        const projectDir = tempProject();
        const pkg = join(projectDir, 'node_modules/lazy-plugin');
        mkdirSync(join(projectDir, 'src'));
        mkdirSync(pkg, { recursive: true });
        writeFileSync(
            join(pkg, 'package.json'),
            JSON.stringify({ name: 'lazy-plugin', type: 'module', main: 'index.js' })
        );
        writeFileSync(join(pkg, 'word.js'), "export const word = 'hi from a package';\n");
        writeFileSync(
            join(pkg, 'index.js'),
            `export default function lazy() {
    return {
        name: 'lazy-package',
        async load(id) {
            if (!id.endsWith('/probe.ts')) return undefined;
            const { word } = await import('./word.js');
            return \`export default \${JSON.stringify(word)};\`;
        }
    };
}
`
        );
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            `import lazy from 'lazy-plugin';\n\nexport default { root: './src', instance: './bot.ts', build: { start: './index.ts' }, vitePlugins: () => [lazy()] };\n`
        );
        writeFileSync(join(projectDir, 'src/probe.ts'), 'export default undefined;\n');

        await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);
        const probe = await project.modules.importModule<{ default: string }>(join(projectDir, 'src/probe.ts'));

        expect(probe.default).toBe('hi from a package');
    });

    it.each(['[Promise.resolve(greetingPlugin())]', '[[false, [greetingPlugin()]], null]'])(
        'runs a plugin written as %s',
        async (vitePlugins) => {
            const projectDir = tempProject();
            mkdirSync(join(projectDir, 'src'));
            writeFileSync(
                join(projectDir, 'seedcord.config.ts'),
                configWithGreetingPlugin(
                    "root: './src', instance: './bot.ts', build: { start: './index.ts' }",
                    vitePlugins
                )
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
    build: { start: './index.ts' },
    vitePlugins: () => [{ name: 'breaks-in-transform', transform: (_code, id) => { if (id.endsWith('/word.ts')) throw new Error('bad yaml on line 3'); } }]
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
    build: { start: './index.ts' },
    vitePlugins: () => [{ name: 'breaks-on-start', config: () => { throw new Error('bad option'); } }]
};
`
        );

        const caught: unknown = await openProject(
            new ProjectLoader(openModuleLoader, new ShellMode()),
            projectDir
        ).catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        const message = stripVTControlCharacters(caught.message);
        expect(message).toContain('breaks-on-start');
        expect(message).toContain('its config hook');
        expect(message).toContain('bad option');
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

describe('the loader that ran seedcord.config.ts', () => {
    function stubProject(config: unknown, botFails = false): { loader: ProjectLoader; dir: string } & StubModules {
        const dir = tempProject();
        writeFileSync(join(dir, 'seedcord.config.ts'), '');
        const stub = stubModulesExporting(config);
        const open: OpenModules = (projectDir, target, mode, use) =>
            botFails && use !== 'config'
                ? Promise.reject(new Error('bot loader failed'))
                : stub.open(projectDir, target, mode, use);
        return { ...stub, open, dir, loader: new ProjectLoader(open, new ShellMode()) };
    }

    const WITH_PLUGIN = { ...MINIMAL, vitePlugins: () => [{ name: 'lazy' }] };

    it('closes before readConfig returns for a config with no vitePlugins', async () => {
        const { loader, dir, loaders } = stubProject(MINIMAL);

        await using _loaded = await loader.readConfig(dir);

        expect(loaders).toEqual([{ loads: 'config', closed: true }]);
    });

    it('stays open until the project closes for a config with vitePlugins', async () => {
        const { loader, dir, loaders } = stubProject(WITH_PLUGIN);

        const project = await loader.openProject(await loader.readConfig(dir));
        expect(loaders).toEqual([
            { loads: 'config', closed: false },
            { loads: 'bot', closed: false }
        ]);

        await project[Symbol.asyncDispose]();
        expect(loaders).toEqual([
            { loads: 'config', closed: true },
            { loads: 'bot', closed: true }
        ]);
    });

    it('closes when the bot loader fails to open', async () => {
        const { loader, dir, loaders } = stubProject(WITH_PLUGIN, true);

        await expect(loader.openProject(await loader.readConfig(dir))).rejects.toThrow('bot loader failed');

        expect(loaders).toEqual([{ loads: 'config', closed: true }]);
    });

    it('closes when the check passed to readConfig throws', async () => {
        const { loader, dir, loaders } = stubProject(WITH_PLUGIN);
        const failedCheck = new Error('entry missing');

        await expect(
            loader.readConfig(dir, () => {
                throw failedCheck;
            })
        ).rejects.toBe(failedCheck);

        expect(loaders).toEqual([{ loads: 'config', closed: true }]);
    });
});
