import { chmod, mkdir, mkdtempDisposable, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { HostAugmentTarget, HostPluginKeys, SeedcordBrand } from '@seedcord/types/internal';
import { ApplicationCommandType } from 'discord.js';
import { assert, describe, expect, it, onTestFinished } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';
import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { quietSteps } from '#core/output/quietSteps';

import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

const OUTPUT = 'seedcord-gen.d.ts';

async function tempDir(prefix: string): Promise<string> {
    const dir = await mkdtempDisposable(join(tmpdir(), prefix));
    onTestFinished(() => dir.remove());
    return dir.path;
}

class BanCommand extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('ban').setDescription('Ban a member');
    }
}
RegisterCommand('global')(BanCommand);

function silentLogger(overrides: Partial<ILogger> = {}): ILogger {
    return {
        error: () => undefined,
        warn: () => undefined,
        info: () => undefined,
        debug: () => undefined,
        trace: () => undefined,
        ...overrides
    };
}

// justified: codegen reads only these paths off the config
function configAt(root: string, instance: string): ResolvedSeedcordDevConfig {
    return {
        root,
        instance,
        configFile: resolve(root, 'seedcord.config.ts'),
        entry: resolve(root, 'index.ts'),
        build: { outDir: resolve(root, 'dist') }
    } as ResolvedSeedcordDevConfig;
}

function runnerWith(
    config: ResolvedSeedcordDevConfig,
    importModule: (entryPath: string) => Promise<unknown>,
    logger: ILogger
): CodegenRunner {
    // justified: codegen reaches the loader through open() and the returned importModule
    const projectLoader = {
        open: () =>
            Promise.resolve({
                config,
                modules: { importModule } as ModuleLoader,
                [Symbol.asyncDispose]: () => Promise.resolve()
            })
    } as unknown as ProjectLoader;

    return new CodegenRunner({ steps: quietSteps, projectLoader, generator: new AugmentationBuilder(logger), logger });
}

// no commands path, so the scan is empty and the rendered registry is deterministic.
function makeRunner(root: string, logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> =>
        Promise.resolve({
            default: {
                [SeedcordBrand]: true,
                [HostAugmentTarget]: '@seedcord/gateway',
                [HostPluginKeys]: [],
                config: { bot: { commands: { path: null } } }
            }
        });

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
            ? Promise.resolve({
                  default: {
                      [SeedcordBrand]: true,
                      [HostAugmentTarget]: '@seedcord/gateway',
                      [HostPluginKeys]: [],
                      config: { bot: { commands: { path: commandsPath } } }
                  }
              })
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
    const importModule = (): Promise<unknown> =>
        Promise.resolve({
            default: Promise.resolve({
                [SeedcordBrand]: true,
                [HostAugmentTarget]: '@seedcord/gateway',
                [HostPluginKeys]: [],
                config: { bot: { commands: { path: null } } }
            })
        });

    return runnerWith(configAt(root, resolve(root, 'bot.ts')), importModule, logger);
}

function pluginRunner(root: string, instance: string, pluginKeys: readonly string[], logger: ILogger): CodegenRunner {
    const importModule = (): Promise<unknown> =>
        Promise.resolve({
            default: {
                [SeedcordBrand]: true,
                [HostAugmentTarget]: '@seedcord/gateway',
                [HostPluginKeys]: pluginKeys,
                config: { bot: { commands: { path: null } } }
            }
        });

    return runnerWith(configAt(root, instance), importModule, logger);
}

describe('CodegenRunner plugin capabilities', () => {
    it('augments Core from the attach keys and imports the bot entry', async () => {
        const root = await tempDir('codegen-');
        await pluginRunner(root, resolve(root, 'bot.ts'), ['db'], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from './bot';");
        expect(output).toContain("        db: (typeof Bot)['db'];");
    });

    it('writes a nested bot entry as a relative specifier with no extension', async () => {
        const root = await tempDir('codegen-');
        await pluginRunner(root, resolve(root, 'app/bot.ts'), ['db'], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from './app/bot';");
    });

    it('writes a bot entry above the root as a parent specifier', async () => {
        const root = await tempDir('codegen-');
        const instance = resolve(root, '..', `${root.split('/').pop() ?? 'x'}-bot.ts`);
        await pluginRunner(root, instance, ['db'], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from '../");
    });

    it('emits no import and no Core block when nothing is attached', async () => {
        const root = await tempDir('codegen-');
        await pluginRunner(root, resolve(root, 'bot.ts'), [], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).not.toContain('import type');
        expect(output).not.toContain('interface Core');
    });
});

describe('CodegenRunner', () => {
    it('writes the rendered registry to the project root', async () => {
        const root = await tempDir('codegen-');
        await makeRunner(root, silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("declare module '@seedcord/gateway'");
    });

    it('--check throws and names the fix when the registry is stale', async () => {
        const root = await tempDir('codegen-');
        await writeFile(resolve(root, OUTPUT), 'stale content', 'utf8');

        const check = makeRunner(root, silentLogger()).run(true);

        await expect(check).rejects.toMatchObject({ code: SeedcordErrorCode.CliCodegenOutOfDate });
        await expect(check).rejects.toThrow(/seedcord codegen/);
    });

    it('--check resolves with the registry path when the registry matches', async () => {
        const root = await tempDir('codegen-');
        await makeRunner(root, silentLogger()).run(false);

        await expect(makeRunner(root, silentLogger()).run(true)).resolves.toEqual({
            outputPath: resolve(root, OUTPUT)
        });
    });

    it('renders an empty registry when the instance declares no commands path', async () => {
        const root = await tempDir('codegen-');
        await makeRunner(root, silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain('interface SlashRegistry {\n\n    }');
        expect(written).not.toContain('kind:');
    });

    it('scans command classes and skips non-command exports', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');

        class NotACommand {
            greet(): string {
                return 'hi';
            }
        }
        const NOT_A_FUNCTION = { hello: 'world' };

        await scanRunner(root, cmdDir, () => ({ BanCommand, NotACommand, NOT_A_FUNCTION }), silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });

    it('scans a command once when a barrel re-exports it, instead of throwing a duplicate route', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        await writeFile(join(cmdDir, 'index.ts'), 'export {};', 'utf8');

        // ban.ts and index.ts both yield the same class object, as a re-export would.
        await scanRunner(root, cmdDir, () => ({ BanCommand }), silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });

    it('throws CliCodegenCommandsDirUnreadable when the top-level commands dir is unreadable', async () => {
        const root = await tempDir('codegen-');
        const missing = join(root, 'does-not-exist');

        let caught: unknown;
        try {
            await scanRunner(root, missing, () => ({}), silentLogger()).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCodegenCommandsDirUnreadable });
        expect((caught as Error).message).toContain(missing);
    });

    it('warns and skips a nested unreadable subdir instead of throwing', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        const locked = join(cmdDir, 'locked');
        await mkdir(locked);
        await writeFile(join(locked, 'x.ts'), 'export {};', 'utf8');
        await chmod(locked, 0o000);

        const warnings: string[] = [];
        try {
            await scanRunner(
                root,
                cmdDir,
                () => ({ BanCommand }),
                silentLogger({ warn: (message) => warnings.push(String(message)) })
            ).run(false);
        } finally {
            await chmod(locked, 0o755);
        }

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
        expect(warnings.some((warning) => warning.includes('locked'))).toBe(true);
    });

    it('resolves the commands path relative to cwd', async () => {
        const root = await tempDir('codegen-');
        const relativePath = 'no/such/rel';

        let caught: unknown;
        try {
            await scanRunner(root, relativePath, () => ({}), silentLogger()).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCodegenCommandsDirUnreadable });
        expect((caught as Error).message).toContain(resolve(process.cwd(), relativePath));
    });

    it('throws CliInstanceInvalid when the instance is not a Seedcord instance', async () => {
        const root = await tempDir('codegen-');

        let caught: unknown;
        try {
            await invalidRunner(root, silentLogger()).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliInstanceInvalid });
    });

    it('accepts an instance exported as a promise', async () => {
        const root = await tempDir('codegen-');
        await asyncInstanceRunner(root, silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("declare module '@seedcord/gateway'");
    });

    it('--check leaves a current registry untouched', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');

        const exports = (): Record<string, unknown> => ({ BanCommand });
        await scanRunner(root, cmdDir, exports, silentLogger()).run(false);
        const written = await stat(resolve(root, OUTPUT));

        await scanRunner(root, cmdDir, exports, silentLogger()).run(true);

        const afterCheck = await stat(resolve(root, OUTPUT));
        expect(afterCheck.mtimeMs).toBe(written.mtimeMs);
    });

    it('emits context-menu commands into the user and message registries alongside slash routes', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
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

        await scanRunner(root, cmdDir, () => ({ BanCommand, ViewProfile, ReportMessage }), silentLogger()).run(false);

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
        const cmdDir = await tempDir('cmds-');
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
            await scanRunner(root, cmdDir, () => ({ BrokenCommand }), silentLogger()).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCodegenCommandConstructorThrew });
        expect(caught).toHaveProperty('cause.message', 'the database was not ready');
        expect((caught as Error).message).toContain('BrokenCommand');
        expect((caught as Error).message).toContain('the database was not ready');
    });

    it('reports every command whose constructor throws at once', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
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

        const caught: unknown = await scanRunner(root, cmdDir, moduleByPath, silentLogger())
            .run(false)
            .catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.CliCodegenCommandProblems));
        expect(caught.errors).toMatchObject([
            {
                code: SeedcordErrorCode.CliCodegenCommandConstructorThrew,
                cause: { message: 'Invalid string length' }
            },
            {
                code: SeedcordErrorCode.CliCodegenCommandConstructorThrew,
                cause: { message: 'Expected a string for option "sides"' }
            }
        ]);
    });

    it('reports the constructor problems found before a file that fails to import', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
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

        const caught: unknown = await scanRunner(root, cmdDir, moduleByPath, silentLogger())
            .run(false)
            .catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.CliCodegenCommandProblems));
        expect(caught.errors).toMatchObject([
            { code: SeedcordErrorCode.CliCodegenCommandConstructorThrew },
            { code: SeedcordErrorCode.CliCodegenCommandConstructorThrew },
            importFailure
        ]);
    });

    it('skips a BuilderComponent subclass carrying no @RegisterCommand', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
        await writeFile(join(cmdDir, 'base.ts'), 'export {};', 'utf8');

        class Undecorated extends BuilderComponent<'command'> {
            public constructor() {
                super('command');
                this.instance.setName('undecorated').setDescription('carries no decorator');
            }
        }

        await scanRunner(root, cmdDir, () => ({ Undecorated }), silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).not.toContain('undecorated');
    });

    it('skips an undecorated export whose constructor throws', async () => {
        const root = await tempDir('codegen-');
        const cmdDir = await tempDir('cmds-');
        await writeFile(join(cmdDir, 'helpers.ts'), 'export {};', 'utf8');

        // the scan constructs with no arguments
        class Formatter {
            public readonly prefix: string;

            constructor(prefix: string) {
                if (prefix.length === 0) throw new Error('needs a prefix');
                this.prefix = prefix;
            }
        }

        await scanRunner(root, cmdDir, () => ({ BanCommand, Formatter }), silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("ban: { options: {}; cache: 'cached' }");
    });
});
