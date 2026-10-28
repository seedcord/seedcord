import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { HostAugmentTarget, HostPluginKeys, SeedcordBrand } from '@seedcord/types/internal';
import { onTestFinished } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';
import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { quietSteps } from '#core/output/quietSteps';
import { Project } from '#core/project/Project';
import { realPath } from '#core/project/realPath';
import { emptyModuleGraph } from '#tests/emptyModuleGraph';
import { loadedConfig } from '#tests/loadedConfig';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { RealPath } from '#core/project/realPath';
import type { ILogger } from '@seedcord/types';

export const OUTPUT = 'seedcord-gen.d.ts';

export async function tempDir(prefix: string): Promise<RealPath> {
    const dir = await mkdtempDisposable(join(tmpdir(), prefix));
    onTestFinished(() => dir.remove());
    return realPath(dir.path);
}

export async function commandsUnder(root: string): Promise<string> {
    return mkdir(join(root, 'commands')).then(() => join(root, 'commands'));
}

export class BanCommand extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('ban').setDescription('Ban a member');
    }
}
RegisterCommand('global')(BanCommand);

export function configAt(root: string, instance: string): ResolvedSeedcordConfig {
    mkdirSync(dirname(instance), { recursive: true });
    writeFileSync(instance, '');
    onTestFinished(() => rmSync(instance, { force: true }));
    const at = (path: string): RealPath => realPath(resolve(root, path));
    return {
        root: at('.'),
        instance: at(instance),
        configFile: at('seedcord.config.ts'),
        target: { kind: 'server', start: at('index.ts'), outDir: at('dist') },
        build: {},
        files: [],
        typecheck: { enabled: false },
        idleAnimation: false,
        tunnel: { mode: 'off' },
        viteMode: 'development',
        vitePlugins: vitePluginsOf()
    };
}

export function projectOpener(config: ResolvedSeedcordConfig, modules: ModuleLoader & AsyncDisposable): ProjectOpener {
    return {
        readConfig: () => Promise.resolve(loadedConfig(config)),
        openProject: (loaded) => Promise.resolve(new Project(loaded.config, loaded.files, modules))
    };
}

export function loaderFrom(
    importModule: (entryPath: string) => Promise<unknown>,
    onDispose = (): void => undefined
): ModuleLoader & AsyncDisposable {
    // justified: importModule hands back whatever module the test built
    return {
        importModule,
        ...emptyModuleGraph,
        [Symbol.asyncDispose]: () => {
            onDispose();
            return Promise.resolve();
        }
    } as ModuleLoader & AsyncDisposable;
}

function runnerWith(
    config: ResolvedSeedcordConfig,
    importModule: (entryPath: string) => Promise<unknown>,
    logger: ILogger
): CodegenRunner {
    const projectLoader = projectOpener(config, loaderFrom(importModule));
    return new CodegenRunner({ steps: quietSteps, projectLoader, generator: new AugmentationBuilder(logger), logger });
}

export function brandedInstance(commandsPath: string | null = null, pluginKeys: readonly string[] = []): object {
    return {
        [SeedcordBrand]: true,
        [HostAugmentTarget]: '@seedcord/gateway',
        [HostPluginKeys]: pluginKeys,
        config: { bot: { commands: { path: commandsPath } } }
    };
}

// a bot with no commands path, for a registry that never changes
export function makeRunner(root: string, logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: brandedInstance() });

    return runnerWith(configAt(root, resolve(root, 'bot.ts')), importModule, logger);
}

// importModule returns the branded instance for instancePath and the command module for every other path.
export function scanRunner(
    root: string,
    commandsPath: string | null,
    moduleByPath: (entryPath: string) => Record<string, unknown>,
    logger: ILogger
): CodegenRunner {
    const instancePath = resolve(root, 'bot.ts');
    const importModule = (entryPath: string): Promise<unknown> =>
        entryPath === instancePath
            ? Promise.resolve({ default: brandedInstance(commandsPath) })
            : Promise.resolve(moduleByPath(entryPath));

    return runnerWith(configAt(root, instancePath), importModule, logger);
}

// instance double whose default export carries no SeedcordBrand, to exercise the isSeedcordInstance guard.
export function invalidRunner(root: string, logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: { not: 'branded' } });

    return runnerWith(configAt(root, resolve(root, 'bot.ts')), importModule, logger);
}

// dev accepts a default export that resolves to the instance
export function asyncInstanceRunner(root: string, logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: Promise.resolve(brandedInstance()) });

    return runnerWith(configAt(root, resolve(root, 'bot.ts')), importModule, logger);
}

export function pluginRunner(
    root: string,
    instance: string,
    pluginKeys: readonly string[],
    logger: ILogger
): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: brandedInstance(null, pluginKeys) });

    return runnerWith(configAt(root, instance), importModule, logger);
}
