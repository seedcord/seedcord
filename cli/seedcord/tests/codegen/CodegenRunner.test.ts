import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { chmod, mkdir, mkdtempDisposable, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { CommandMetadataKey } from '@seedcord/core/internal';
import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { HostAugmentTarget, HostPluginKeys, SeedcordBrand } from '@seedcord/types/internal';
import { ApplicationCommandType, ButtonStyle } from 'discord.js';
import { assert, describe, expect, it, onTestFinished } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';
import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { quietSteps } from '#core/output/quietSteps';
import { Project } from '#core/project/Project';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { loadedConfig } from '#tests/loadedConfig';
import { silentLogger } from '#tests/silentLogger';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { RealPath } from '#core/project/realPath';
import type { ILogger } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';

const OUTPUT = 'seedcord-gen.d.ts';

async function tempDir(prefix: string): Promise<RealPath> {
    const dir = await mkdtempDisposable(join(tmpdir(), prefix));
    onTestFinished(() => dir.remove());
    return realPath(dir.path);
}

async function commandsUnder(root: string): Promise<string> {
    return mkdir(join(root, 'commands')).then(() => join(root, 'commands'));
}

class BanCommand extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('ban').setDescription('Ban a member');
    }
}
RegisterCommand('global')(BanCommand);

function configAt(root: string, instance: string): ResolvedSeedcordConfig {
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

function projectOpener(config: ResolvedSeedcordConfig, modules: ModuleLoader & AsyncDisposable): ProjectOpener {
    return {
        readConfig: () => Promise.resolve(loadedConfig(config)),
        openProject: (loaded) => Promise.resolve(new Project(loaded.config, loaded.files, modules))
    };
}

function runnerWith(
    config: ResolvedSeedcordConfig,
    importModule: (entryPath: string) => Promise<unknown>,
    logger: ILogger
): CodegenRunner {
    // justified: codegen reads only importModule off the loader
    const modules = { importModule, [Symbol.asyncDispose]: () => Promise.resolve() } as ModuleLoader & AsyncDisposable;
    const projectLoader = projectOpener(config, modules);

    return new CodegenRunner({ steps: quietSteps, projectLoader, generator: new AugmentationBuilder(logger), logger });
}

function brandedInstance(commandsPath: string | null = null, pluginKeys: readonly string[] = []): object {
    return {
        [SeedcordBrand]: true,
        [HostAugmentTarget]: '@seedcord/gateway',
        [HostPluginKeys]: pluginKeys,
        config: { bot: { commands: { path: commandsPath } } }
    };
}

// no commands path, so the scan is empty and the rendered registry is deterministic.
function makeRunner(root: string, logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: brandedInstance() });

    return runnerWith(configAt(root, resolve(root, 'bot.ts')), importModule, logger);
}

// importModule returns the branded instance for instancePath and the command module for every other path.
function scanRunner(
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
function invalidRunner(root: string, logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: { not: 'branded' } });

    return runnerWith(configAt(root, resolve(root, 'bot.ts')), importModule, logger);
}

// dev accepts a default export that resolves to the instance
function asyncInstanceRunner(root: string, logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: Promise.resolve(brandedInstance()) });

    return runnerWith(configAt(root, resolve(root, 'bot.ts')), importModule, logger);
}

function pluginRunner(root: string, instance: string, pluginKeys: readonly string[], logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> => Promise.resolve({ default: brandedInstance(null, pluginKeys) });

    return runnerWith(configAt(root, instance), importModule, logger);
}

describe('CodegenRunner plugin capabilities', () => {
    it('augments Core from the attach keys and imports the bot entry', async () => {
        const root = await tempDir('codegen-');
        await pluginRunner(root, resolve(root, 'bot.ts'), ['db'], silentLogger).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from './bot';");
        expect(output).toContain("        db: (typeof Bot)['db'];");
    });

    it('writes a nested bot entry as a relative specifier with no extension', async () => {
        const root = await tempDir('codegen-');
        await pluginRunner(root, resolve(root, 'app/bot.ts'), ['db'], silentLogger).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from './app/bot';");
    });

    it('writes a bot entry above the root as a parent specifier', async () => {
        const root = await tempDir('codegen-');
        const instance = resolve(root, '..', `${root.split('/').pop() ?? 'x'}-bot.ts`);
        await pluginRunner(root, instance, ['db'], silentLogger).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from '../");
    });

    it('emits no import and no Core block when nothing is attached', async () => {
        const root = await tempDir('codegen-');
        await pluginRunner(root, resolve(root, 'bot.ts'), [], silentLogger).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).not.toContain('import type');
        expect(output).not.toContain('interface Core');
    });
});

describe('CodegenRunner writeFrom', () => {
    it('scans with the loader it is given and never opens the project', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        const notOpened = (): Promise<never> => Promise.reject(new Error('dev already loaded the bot'));
        const projectLoader: ProjectOpener = { readConfig: notOpened, openProject: notOpened };
        const logger = silentLogger;
        const runner = new CodegenRunner({
            steps: quietSteps,
            projectLoader,
            generator: new AugmentationBuilder(logger),
            logger
        });

        // justified: the scan treats every import as an export map
        const modules = { importModule: () => Promise.resolve({ BanCommand }) } as ModuleLoader;
        const config = configAt(root, resolve(root, 'bot.ts'));
        await runner.writeFrom({
            config,
            files: new ProjectFiles(config),
            // justified: codegen reads only the brand keys and config.bot off the instance
            instance: brandedInstance(cmdDir) as SeedcordInstance,
            modules
        });

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });
});

describe('CodegenRunner', () => {
    it('keeps the project open until the command scan finishes', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        const instancePath = resolve(root, 'bot.ts');
        let closed = false;
        // justified: codegen and Project call only these two members
        const modules = {
            importModule: (entryPath: string) => {
                if (closed) return Promise.reject(new Error('Vite module runner has been closed.'));
                return Promise.resolve(
                    entryPath === instancePath ? { default: brandedInstance(cmdDir) } : { BanCommand }
                );
            },
            [Symbol.asyncDispose]: () => {
                closed = true;
                return Promise.resolve();
            }
        } as ModuleLoader & AsyncDisposable;
        const logger = silentLogger;
        const runner = new CodegenRunner({
            steps: quietSteps,
            projectLoader: projectOpener(configAt(root, instancePath), modules),
            generator: new AugmentationBuilder(logger),
            logger
        });

        await runner.run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });

    it('writes the rendered registry to the project root', async () => {
        const root = await tempDir('codegen-');
        await makeRunner(root, silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("declare module '@seedcord/gateway'");
    });

    it('--check throws and names the fix when the registry is stale', async () => {
        const root = await tempDir('codegen-');
        await writeFile(resolve(root, OUTPUT), 'stale content', 'utf8');

        const check = makeRunner(root, silentLogger).run(true);

        await expect(check).rejects.toMatchObject({ code: SeedcordErrorCode.CliCodegenOutOfDate });
        await expect(check).rejects.toThrow(/seedcord codegen/);
    });

    it('--check resolves with the registry path when the registry matches', async () => {
        const root = await tempDir('codegen-');
        await makeRunner(root, silentLogger).run(false);

        await expect(makeRunner(root, silentLogger).run(true)).resolves.toEqual({
            outputPath: resolve(root, OUTPUT),
            changed: false
        });
    });

    it('renders an empty registry when the instance declares no commands path', async () => {
        const root = await tempDir('codegen-');
        await makeRunner(root, silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain('interface SlashRegistry {\n\n    }');
        expect(written).not.toContain('kind:');
    });

    it('scans command classes and skips non-command exports', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');

        class NotACommand {
            greet(): string {
                return 'hi';
            }
        }
        const NOT_A_FUNCTION = { hello: 'world' };

        await scanRunner(root, cmdDir, () => ({ BanCommand, NotACommand, NOT_A_FUNCTION }), silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });

    it('scans a command once when a barrel re-exports it, instead of throwing a duplicate route', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        await writeFile(join(cmdDir, 'index.ts'), 'export {};', 'utf8');

        // ban.ts and index.ts both yield the same class object, as a re-export would.
        await scanRunner(root, cmdDir, () => ({ BanCommand }), silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });

    it('throws CorePathUnreadable when the top-level commands dir is unreadable', async () => {
        const root = await tempDir('codegen-');
        const missing = join(root, 'does-not-exist');

        let caught: unknown;
        try {
            await scanRunner(root, missing, () => ({}), silentLogger).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
        expect((caught as Error).message).toContain(missing);
    });

    // root reads a 0o000 folder anyway. windows ignores the mode
    it.skipIf(process.getuid?.() === 0 || process.platform === 'win32')(
        'throws CorePathUnreadable for a nested unreadable subdir',
        async () => {
            const root = await tempDir('codegen-');
            const cmdDir = await commandsUnder(root);
            await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
            const locked = join(cmdDir, 'locked');
            await mkdir(locked);
            await writeFile(join(locked, 'x.ts'), 'export {};', 'utf8');
            await chmod(locked, 0o000);
            onTestFinished(() => chmod(locked, 0o755));

            const run = scanRunner(root, cmdDir, () => ({ BanCommand }), silentLogger).run(false);

            await expect(run).rejects.toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
            await expect(run).rejects.toThrow(locked);
        }
    );

    it('throws CliCommandNotACommand for a registered class whose component is not a command', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'confirm.ts'), 'export {};', 'utf8');

        class ConfirmButton extends BuilderComponent<'button'> {
            public constructor() {
                super('button');
                this.instance.setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Primary);
            }
        }
        // a cast or plain JS gets past RegisterCommand's types
        Reflect.defineMetadata(CommandMetadataKey, { scope: 'global' }, ConfirmButton);

        const run = scanRunner(root, cmdDir, () => ({ ConfirmButton }), silentLogger).run(false);

        await expect(run).rejects.toMatchObject({ code: SeedcordErrorCode.CliCommandNotACommand });
        await expect(run).rejects.toThrow('ConfirmButton');
    });

    it('resolves the commands path against root', async () => {
        const root = await tempDir('codegen-');
        const relativePath = 'no/such/rel';

        let caught: unknown;
        try {
            await scanRunner(root, relativePath, () => ({}), silentLogger).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
        expect((caught as Error).message).toContain(resolve(root, relativePath));
    });

    it('throws CliInstanceInvalid when the instance is not a Seedcord instance', async () => {
        const root = await tempDir('codegen-');

        let caught: unknown;
        try {
            await invalidRunner(root, silentLogger).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliInstanceInvalid });
    });

    it('accepts an instance exported as a promise', async () => {
        const root = await tempDir('codegen-');
        await asyncInstanceRunner(root, silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("declare module '@seedcord/gateway'");
    });

    it('--check leaves a current registry untouched', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');

        const exports = (): Record<string, unknown> => ({ BanCommand });
        await scanRunner(root, cmdDir, exports, silentLogger).run(false);
        const written = await stat(resolve(root, OUTPUT));

        await scanRunner(root, cmdDir, exports, silentLogger).run(true);

        const afterCheck = await stat(resolve(root, OUTPUT));
        expect(afterCheck.mtimeMs).toBe(written.mtimeMs);
    });

    it('reports whether a regular run changed the registry file', async () => {
        const root = await tempDir('codegen-');

        const first = await makeRunner(root, silentLogger).run(false);
        const second = await makeRunner(root, silentLogger).run(false);

        expect([first.changed, second.changed]).toStrictEqual([true, false]);
    });

    it('leaves an unchanged registry file untouched on a regular run', async () => {
        const root = await tempDir('codegen-');
        await makeRunner(root, silentLogger).run(false);
        const outputPath = resolve(root, OUTPUT);
        const longAgo = new Date('2020-01-01');
        await utimes(outputPath, longAgo, longAgo);

        await makeRunner(root, silentLogger).run(false);

        const { mtimeMs } = await stat(outputPath);
        expect(mtimeMs).toBe(longAgo.getTime());
    });

    it('emits context-menu commands into the user and message registries alongside slash routes', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'commands.ts'), 'export {};', 'utf8');

        class ViewProfile extends BuilderComponent<'context_menu'> {
            public constructor() {
                super('context_menu');
                this.instance.setName('View Profile').setType(ApplicationCommandType.User);
            }
        }
        RegisterCommand('global')(ViewProfile);

        class ReportMessage extends BuilderComponent<'context_menu'> {
            public constructor() {
                super('context_menu');
                this.instance.setName('Report Message').setType(ApplicationCommandType.Message);
            }
        }
        RegisterCommand('global')(ReportMessage);

        await scanRunner(root, cmdDir, () => ({ BanCommand, ViewProfile, ReportMessage }), silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
        expect(written).toContain(
            "    interface UserContextMenuRegistry {\n        'View Profile': { cache: 'cached' };\n    }"
        );
        expect(written).toContain(
            "    interface MessageContextMenuRegistry {\n        'Report Message': { cache: 'cached' };\n    }"
        );
    });

    it('throws and names the command when a registered command constructor throws', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'broken.ts'), 'export {};', 'utf8');

        class BrokenCommand extends BuilderComponent<'command'> {
            constructor() {
                super('command');
                throw new Error('the database was not ready');
            }
        }
        RegisterCommand('global')(BrokenCommand);

        let caught: unknown;
        try {
            await scanRunner(root, cmdDir, () => ({ BrokenCommand }), silentLogger).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCommandConstructorThrew });
        expect(caught).toHaveProperty('cause.message', 'the database was not ready');
        expect((caught as Error).message).toContain('BrokenCommand');
        expect((caught as Error).message).toContain('the database was not ready');
    });

    it('reports every command whose constructor throws at once', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        await writeFile(join(cmdDir, 'roll.ts'), 'export {};', 'utf8');

        class BanCommand extends BuilderComponent<'command'> {
            constructor() {
                super('command');
                throw new Error('Invalid string length');
            }
        }
        class RollCommand extends BuilderComponent<'command'> {
            constructor() {
                super('command');
                throw new Error('Expected a string for option "sides"');
            }
        }
        RegisterCommand('global')(BanCommand);
        RegisterCommand('global')(RollCommand);
        const moduleByPath = (path: string): Record<string, unknown> =>
            path.endsWith('ban.ts') ? { BanCommand } : { RollCommand };

        const caught: unknown = await scanRunner(root, cmdDir, moduleByPath, silentLogger)
            .run(false)
            .catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.CliProblems));
        expect(caught.errors).toMatchObject([
            {
                code: SeedcordErrorCode.CliCommandConstructorThrew,
                cause: { message: 'Invalid string length' }
            },
            {
                code: SeedcordErrorCode.CliCommandConstructorThrew,
                cause: { message: 'Expected a string for option "sides"' }
            }
        ]);
    });

    it('reports the constructor problems found before a file that fails to import', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        for (const file of ['a-ban.ts', 'b-roll.ts', 'c-broken.ts'])
            await writeFile(join(cmdDir, file), 'export {};', 'utf8');

        class BanCommand extends BuilderComponent<'command'> {
            constructor() {
                super('command');
                throw new Error('Invalid string length');
            }
        }
        class RollCommand extends BuilderComponent<'command'> {
            constructor() {
                super('command');
                throw new Error('Expected a string for option "sides"');
            }
        }
        RegisterCommand('global')(BanCommand);
        RegisterCommand('global')(RollCommand);
        const importFailure = new Error('c-broken.ts has a syntax error');
        const moduleByPath = (path: string): Record<string, unknown> => {
            if (path.endsWith('a-ban.ts')) return { BanCommand };
            if (path.endsWith('b-roll.ts')) return { RollCommand };
            throw importFailure;
        };

        const caught: unknown = await scanRunner(root, cmdDir, moduleByPath, silentLogger)
            .run(false)
            .catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.CliProblems));
        expect(caught.errors).toMatchObject([
            { code: SeedcordErrorCode.CliCommandConstructorThrew },
            { code: SeedcordErrorCode.CliCommandConstructorThrew },
            importFailure
        ]);
    });

    it('skips a BuilderComponent subclass carrying no @RegisterCommand', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'base.ts'), 'export {};', 'utf8');

        class Undecorated extends BuilderComponent<'command'> {
            public constructor() {
                super('command');
                this.instance.setName('undecorated').setDescription('carries no decorator');
            }
        }

        await scanRunner(root, cmdDir, () => ({ Undecorated }), silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).not.toContain('undecorated');
    });

    it('skips an undecorated export whose constructor throws', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await commandsUnder(root);
        await writeFile(join(cmdDir, 'helpers.ts'), 'export {};', 'utf8');

        // the scan constructs with no arguments
        class Formatter {
            public readonly prefix: string;

            constructor(prefix: string) {
                if (prefix.length === 0) throw new Error('needs a prefix');
                this.prefix = prefix;
            }
        }

        await scanRunner(root, cmdDir, () => ({ BanCommand, Formatter }), silentLogger).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });
});
