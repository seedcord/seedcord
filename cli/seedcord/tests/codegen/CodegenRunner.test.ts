import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordBrand } from '@seedcord/types/internal';
import { ApplicationCommandType, ContextMenuCommandBuilder, SlashCommandBuilder } from 'discord.js';
import { afterEach, describe, expect, it } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';
import { CodegenRunner } from '#commands/codegen/CodegenRunner';

import type { ConfigLoader } from '#core/config/ConfigLoader';
import type { ConfigLocator } from '#core/config/ConfigLocator';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

const OUTPUT = 'seedcord-gen.d.ts';

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

// no commands path, so the scan is empty and the rendered registry is deterministic.
function makeRunner(root: string, logger: ILogger): CodegenRunner {
    const locator = { locate: () => resolve(root, 'seedcord.config.ts') } as unknown as ConfigLocator;
    const configLoader = {
        load: () => Promise.resolve({ root, instance: resolve(root, 'bot.ts') })
    } as unknown as ConfigLoader;
    const moduleLoader = {
        importModule: () =>
            Promise.resolve({
                default: {
                    [SeedcordBrand]: true,
                    augmentTarget: '@seedcord/gateway',
                    pluginKeys: [],
                    config: { bot: { commands: { path: null } } }
                }
            })
    } as unknown as ModuleLoader;

    return new CodegenRunner(locator, configLoader, moduleLoader, new AugmentationBuilder(logger), logger);
}

// importModule returns the branded instance for instancePath and the command module for every other path.
function scanRunner(
    root: string,
    commandsPath: string | null,
    moduleByPath: (entryPath: string) => Record<string, unknown>,
    logger: ILogger
): CodegenRunner {
    const instancePath = resolve(root, 'bot.ts');
    const locator = { locate: () => resolve(root, 'seedcord.config.ts') } as unknown as ConfigLocator;
    const configLoader = {
        load: () => Promise.resolve({ root, instance: instancePath })
    } as unknown as ConfigLoader;
    const moduleLoader = {
        importModule: (entryPath: string) =>
            entryPath === instancePath
                ? Promise.resolve({
                      default: {
                          [SeedcordBrand]: true,
                          augmentTarget: '@seedcord/gateway',
                          pluginKeys: [],
                          config: { bot: { commands: { path: commandsPath } } }
                      }
                  })
                : Promise.resolve(moduleByPath(entryPath))
    } as unknown as ModuleLoader;

    return new CodegenRunner(locator, configLoader, moduleLoader, new AugmentationBuilder(logger), logger);
}

// instance double whose default export carries no SeedcordBrand, to exercise the isSeedcordInstance guard.
function invalidRunner(root: string, logger: ILogger): CodegenRunner {
    const locator = { locate: () => resolve(root, 'seedcord.config.ts') } as unknown as ConfigLocator;
    const configLoader = {
        load: () => Promise.resolve({ root, instance: resolve(root, 'bot.ts') })
    } as unknown as ConfigLoader;
    const moduleLoader = {
        importModule: () => Promise.resolve({ default: { not: 'branded' } })
    } as unknown as ModuleLoader;

    return new CodegenRunner(locator, configLoader, moduleLoader, new AugmentationBuilder(logger), logger);
}

function pluginRunner(root: string, instance: string, pluginKeys: readonly string[], logger: ILogger): CodegenRunner {
    const locator = { locate: () => resolve(root, 'seedcord.config.ts') } as unknown as ConfigLocator;
    const configLoader = { load: () => Promise.resolve({ root, instance }) } as unknown as ConfigLoader;
    const moduleLoader = {
        importModule: () =>
            Promise.resolve({
                default: {
                    [SeedcordBrand]: true,
                    augmentTarget: '@seedcord/gateway',
                    pluginKeys,
                    config: { bot: { commands: { path: null } } }
                }
            })
    } as unknown as ModuleLoader;

    return new CodegenRunner(locator, configLoader, moduleLoader, new AugmentationBuilder(logger), logger);
}

describe('CodegenRunner plugin capabilities', () => {
    it('augments Core from the attach keys and imports the bot entry', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await pluginRunner(root, resolve(root, 'bot.ts'), ['db'], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from './bot';");
        expect(output).toContain("        db: (typeof Bot)['db'];");
    });

    it('writes a nested bot entry as a relative specifier with no extension', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await pluginRunner(root, resolve(root, 'app/bot.ts'), ['db'], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from './app/bot';");
    });

    it('writes a bot entry above the root as a parent specifier', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const instance = resolve(root, '..', `${root.split('/').pop() ?? 'x'}-bot.ts`);
        await pluginRunner(root, instance, ['db'], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).toContain("import type Bot from '../");
    });

    it('emits no import and no Core block when nothing is attached', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await pluginRunner(root, resolve(root, 'bot.ts'), [], silentLogger()).run(false);

        const output = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(output).not.toContain('import type');
        expect(output).not.toContain('interface Core');
    });
});

describe('CodegenRunner', () => {
    afterEach(() => {
        process.exitCode = 0;
    });

    it('writes the rendered registry to the project root', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await makeRunner(root, silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("declare module '@seedcord/gateway'");
    });

    it('--check exits non-zero and names the fix when the registry is stale', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await writeFile(resolve(root, OUTPUT), 'stale content', 'utf8');

        const errors: string[] = [];
        await makeRunner(root, silentLogger({ error: (message) => errors.push(String(message)) })).run(true);

        expect(process.exitCode).toBe(1);
        expect(errors.join('\n')).toContain('seedcord codegen');
    });

    it('--check exits zero when the registry matches', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await makeRunner(root, silentLogger()).run(false);

        await makeRunner(root, silentLogger()).run(true);
        expect(process.exitCode).toBe(0);
    });

    it('renders an empty registry when the instance declares no commands path', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await makeRunner(root, silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain('interface SlashRegistry {\n\n    }');
        expect(written).not.toContain('kind:');
    });

    it('scans command classes and skips non-command exports', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const cmdDir = await mkdtemp(join(tmpdir(), 'cmds-'));
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');

        class BanCommand {
            component = new SlashCommandBuilder().setName('ban').setDescription('Ban a member');
        }
        class NotACommand {
            greet(): string {
                return 'hi';
            }
        }
        const NOT_A_FUNCTION = { hello: 'world' };

        await scanRunner(root, cmdDir, () => ({ BanCommand, NotACommand, NOT_A_FUNCTION }), silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain('ban: { options: {}; cache: undefined }');
    });

    it('scans a command once when a barrel re-exports it, instead of throwing a duplicate route', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const cmdDir = await mkdtemp(join(tmpdir(), 'cmds-'));
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        await writeFile(join(cmdDir, 'index.ts'), 'export {};', 'utf8');

        class BanCommand {
            component = new SlashCommandBuilder().setName('ban').setDescription('Ban a member');
        }
        // ban.ts and index.ts both yield the same class object, as a re-export would.
        await scanRunner(root, cmdDir, () => ({ BanCommand }), silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain('ban: { options: {}; cache: undefined }');
    });

    it('throws CliCodegenCommandsDirUnreadable when the top-level commands dir is unreadable', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
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
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const cmdDir = await mkdtemp(join(tmpdir(), 'cmds-'));
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');
        const locked = join(cmdDir, 'locked');
        await mkdir(locked);
        await writeFile(join(locked, 'x.ts'), 'export {};', 'utf8');
        await chmod(locked, 0o000);

        class BanCommand {
            component = new SlashCommandBuilder().setName('ban').setDescription('Ban a member');
        }
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
        expect(written).toContain('ban: { options: {}; cache: undefined }');
        expect(warnings.some((warning) => warning.includes('locked'))).toBe(true);
    });

    it('resolves the commands path relative to cwd', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
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
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));

        let caught: unknown;
        try {
            await invalidRunner(root, silentLogger()).run(false);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliInstanceInvalid });
    });

    it('--check exits zero and writes nothing when the registry is current', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const cmdDir = await mkdtemp(join(tmpdir(), 'cmds-'));
        await writeFile(join(cmdDir, 'ban.ts'), 'export {};', 'utf8');

        class BanCommand {
            component = new SlashCommandBuilder().setName('ban').setDescription('Ban a member');
        }
        const exports = (): Record<string, unknown> => ({ BanCommand });

        await scanRunner(root, cmdDir, exports, silentLogger()).run(false);
        await scanRunner(root, cmdDir, exports, silentLogger()).run(true);

        expect(process.exitCode).toBe(0);
    });

    it('emits context-menu commands into the user and message registries alongside slash routes', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const cmdDir = await mkdtemp(join(tmpdir(), 'cmds-'));
        await writeFile(join(cmdDir, 'commands.ts'), 'export {};', 'utf8');

        class BanCommand {
            component = new SlashCommandBuilder().setName('ban').setDescription('Ban a member');
        }
        class ViewProfile {
            component = new ContextMenuCommandBuilder().setName('View Profile').setType(ApplicationCommandType.User);
        }
        class ReportMessage {
            component = new ContextMenuCommandBuilder()
                .setName('Report Message')
                .setType(ApplicationCommandType.Message);
        }

        await scanRunner(root, cmdDir, () => ({ BanCommand, ViewProfile, ReportMessage }), silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain('ban: { options: {}; cache: undefined }');
        expect(written).toContain(
            "    interface UserContextMenuRegistry {\n        'View Profile': { cache: undefined };\n    }"
        );
        expect(written).toContain(
            "    interface MessageContextMenuRegistry {\n        'Report Message': { cache: undefined };\n    }"
        );
    });

    it('throws and names the command when a registered command constructor throws', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const cmdDir = await mkdtemp(join(tmpdir(), 'cmds-'));
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
        expect((caught as Error).message).toContain('BrokenCommand');
        expect((caught as Error).message).toContain('the database was not ready');
    });

    it('skips an undecorated export whose constructor throws', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        const cmdDir = await mkdtemp(join(tmpdir(), 'cmds-'));
        await writeFile(join(cmdDir, 'helpers.ts'), 'export {};', 'utf8');

        class BanCommand {
            component = new SlashCommandBuilder().setName('ban').setDescription('Ban a member');
        }
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
        expect(written).toContain('ban: { options: {}; cache: undefined }');
    });
});
