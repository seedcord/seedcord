import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { SeedcordBrand, type Brandable } from '@seedcord/types/internal';
import { isTsOrJsFile } from '@seedcord/utils';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { ConfigLoader } from '@core/config/ConfigLoader';
import { ConfigLocator } from '@core/config/ConfigLocator';
import { RuntimeModuleLoader } from '@core/modules/RuntimeModuleLoader';
import { resolveDefaultExport } from '@utils/resolveDefaultExport';

import { RegistryGenerator } from './RegistryGenerator';
import { renderRegistry } from './renderRegistry';

import type { ScannedCommand } from './RegistryGenerator';
import type { ResolvedSeedcordDevConfig } from '@core/config/schema';
import type { ModuleLoader } from '@core/modules/ModuleLoader';
import type { ILogger, SeedcordInstance } from '@seedcord/types';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

const OUTPUT_FILENAME = 'command-registry.gen.ts';

interface BuilderLike {
    component: { toJSON: () => unknown };
}

/**
 * Orchestrates `seedcord codegen`. Locates and loads the CLI config, imports the user's Seedcord instance to
 * read its commands directory, scans and instantiates each command for its `toJSON()`, then renders the
 * registry and either writes it or, under `--check`, diffs it against the committed file.
 */
export class CodegenRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly moduleLoader: ModuleLoader,
        private readonly generator: RegistryGenerator,
        private readonly logger: ILogger
    ) {}

    public static create(logger: ILogger): CodegenRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);
        const generator = new RegistryGenerator(logger);

        return new CodegenRunner(locator, configLoader, moduleLoader, generator, logger);
    }

    public async run(check: boolean): Promise<void> {
        const config = await this.loadConfig();
        const rendered = renderRegistry(this.generator.generate(await this.scan(config)));
        const outputPath = resolve(config.root, OUTPUT_FILENAME);

        if (check) {
            await this.check(rendered, outputPath);
            return;
        }

        await this.write(rendered, outputPath);
    }

    private async loadConfig(): Promise<ResolvedSeedcordDevConfig> {
        return this.configLoader.load(this.locator.locate());
    }

    private async scan(config: ResolvedSeedcordDevConfig): Promise<ScannedCommand[]> {
        const commandsDir = await this.resolveCommandsDir(config);
        if (!commandsDir) return [];

        const commands: ScannedCommand[] = [];
        await this.walk(commandsDir, commands, new Set(), true);
        return commands;
    }

    // the bot's own scan runs under tsx/vite, so its import() handles .ts. codegen runs under plain node, so
    // it imports each command file through the tsx-backed module loader instead.
    private async walk(dir: string, commands: ScannedCommand[], seen: Set<unknown>, isRoot: boolean): Promise<void> {
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            // an unreadable top-level commands dir would silently pass --check against a stale registry, so fail.
            if (isRoot) throw new SeedcordError(SeedcordErrorCode.CliCodegenCommandsDirUnreadable, [dir, reason]);
            this.logger.warn(`Skipping unreadable directory ${dir}. ${reason}.`);
            return;
        }

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.walk(fullPath, commands, seen, false);
            } else if (isTsOrJsFile(entry)) {
                const imported = await this.moduleLoader.importModule<Record<string, unknown>>(fullPath);
                for (const exported of Object.values(imported)) {
                    // a barrel re-exports the same class object, so scan each command once.
                    if (seen.has(exported)) continue;
                    seen.add(exported);
                    const json = this.commandJsonOf(exported);
                    if (json) commands.push({ sourceFile: fullPath, json });
                }
            }
        }
    }

    private async resolveCommandsDir(config: ResolvedSeedcordDevConfig): Promise<string | undefined> {
        // loading the instance constructs the bot to read commands.path, so its lifecycle and plugin setup logs
        // follow this line. codegen never starts the bot, nothing logs in or connects.
        this.logger.info('Loading instance to resolve the commands directory');
        const module = await this.moduleLoader.importModule(config.instance);
        const instance = resolveDefaultExport(module);
        if (!this.isSeedcordInstance(instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
        }

        // the bot resolves commands.path relative to cwd, so codegen must too or it scans the wrong dir.
        const commandsPath = instance.config.bot.commands.path;
        return commandsPath ? resolve(process.cwd(), commandsPath) : undefined;
    }

    private commandJsonOf(exported: unknown): RESTPostAPIApplicationCommandsJSONBody | undefined {
        if (typeof exported !== 'function') return undefined;

        let instance: unknown;
        try {
            instance = new (exported as new () => unknown)();
        } catch {
            // not an instantiable command (or a side-effecting constructor); skip it.
            return undefined;
        }

        if (!this.isBuilderLike(instance)) return undefined;
        const json = instance.component.toJSON();
        if (!this.isApplicationCommand(json)) return undefined;
        return json;
    }

    private isBuilderLike(value: unknown): value is BuilderLike {
        if (typeof value !== 'object' || value === null) return false;
        const component = (value as { component?: unknown }).component;
        return (
            typeof component === 'object' &&
            component !== null &&
            typeof (component as BuilderLike['component']).toJSON === 'function'
        );
    }

    private isApplicationCommand(json: unknown): json is RESTPostAPIApplicationCommandsJSONBody {
        if (typeof json !== 'object' || json === null) return false;
        const { name, type } = json as { name?: unknown; type?: unknown };
        if (typeof name !== 'string') return false;
        // chat-input commands omit type or set it to ChatInput, context menus set User/Message. A
        // PrimaryEntryPoint or any other type is not something codegen registers, so drop it.
        return (
            type === undefined ||
            type === ApplicationCommandType.ChatInput ||
            type === ApplicationCommandType.User ||
            type === ApplicationCommandType.Message
        );
    }

    private isSeedcordInstance(candidate: unknown): candidate is SeedcordInstance {
        return typeof candidate === 'object' && candidate !== null && (candidate as Brandable)[SeedcordBrand] === true;
    }

    private async write(rendered: string, outputPath: string): Promise<void> {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, rendered, 'utf8');
        this.logger.info(`Command registry written to ${outputPath}`);
    }

    private async check(rendered: string, outputPath: string): Promise<void> {
        const onDisk = existsSync(outputPath) ? await readFile(outputPath, 'utf8') : '';
        if (onDisk === rendered) return;

        this.logger.error(`Command registry is out of date. Run \`seedcord codegen\` and commit ${outputPath}.`);
        process.exitCode = 1;
    }
}
