import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { CommandMetadataKey } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { SeedcordBrand, type Brandable, type SeedcordInstance } from '@seedcord/types/internal';
import { isTsOrJsFile } from '@seedcord/utils/node';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { ConfigLoader } from '#core/config/ConfigLoader';
import { ConfigLocator } from '#core/config/ConfigLocator';
import { RuntimeModuleLoader } from '#core/modules/RuntimeModuleLoader';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import { AugmentationBuilder } from './AugmentationBuilder';
import { renderAugmentation } from './renderAugmentation';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ScannedCommand } from './AugmentationBuilder';
import type { EmojiConfig, ILogger, TypedOmit } from '@seedcord/types';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

const OUTPUT_FILENAME = 'seedcord-gen.d.ts';

const ENTRY_EXTENSION = /\.[mc]?[jt]sx?$/;

interface BuilderLike {
    component: { toJSON: () => unknown };
}

interface ScanResult {
    commands: ScannedCommand[];
    emojis: EmojiConfig;
    augmentTarget: string;
    pluginKeys: readonly string[];
}

// extensionless resolves under moduleResolution bundler, which a seedcord project sets
function botSpecifier(root: string, instance: string): string {
    const posix = relative(root, instance).split(sep).join('/').replace(ENTRY_EXTENSION, '');
    return posix.startsWith('.') ? posix : `./${posix}`;
}

export class CodegenRunner {
    constructor(
        private readonly locator: ConfigLocator,
        private readonly configLoader: ConfigLoader,
        private readonly moduleLoader: ModuleLoader,
        private readonly generator: AugmentationBuilder,
        private readonly logger: ILogger
    ) {}

    public static create(logger: ILogger): CodegenRunner {
        const moduleLoader = new RuntimeModuleLoader();
        const locator = new ConfigLocator(logger);
        const configLoader = new ConfigLoader(moduleLoader, logger);
        const generator = new AugmentationBuilder(logger);

        return new CodegenRunner(locator, configLoader, moduleLoader, generator, logger);
    }

    public async run(check: boolean): Promise<void> {
        const config = await this.loadConfig();
        const { commands, emojis, augmentTarget, pluginKeys } = await this.scan(config);
        const rendered = renderAugmentation(this.generator.generate(commands, emojis), augmentTarget, {
            specifier: botSpecifier(config.root, config.instance),
            keys: pluginKeys
        });
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

    private async scan(config: ResolvedSeedcordDevConfig): Promise<ScanResult> {
        const { commandsDir, emojis, augmentTarget, pluginKeys } = await this.resolveInstance(config);

        const commands: ScannedCommand[] = [];
        if (commandsDir) {
            for await (const command of this.walk(commandsDir, new Set(), true)) {
                commands.push(command);
            }
        }
        return { commands, emojis, augmentTarget, pluginKeys };
    }

    // the bot scans under tsx/vite where import() takes a .ts path. codegen runs under plain node, hence the
    // tsx-backed module loader below.
    private async *walk(dir: string, seen: Set<unknown>, isRoot: boolean): AsyncGenerator<ScannedCommand> {
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown error';
            // an unreadable commands dir would pass --check against a stale registry
            if (isRoot) throw new SeedcordError(SeedcordErrorCode.CliCodegenCommandsDirUnreadable, [dir, reason]);
            this.logger.warn(`Skipping unreadable directory ${dir}. ${reason}.`);
            return;
        }

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* this.walk(fullPath, seen, false);
            } else if (isTsOrJsFile(entry)) {
                const imported = await this.moduleLoader.importModule<Record<string, unknown>>(fullPath);
                for (const exported of Object.values(imported)) {
                    // a barrel re-exports the same class object
                    if (seen.has(exported)) continue;
                    seen.add(exported);
                    const json = this.commandJsonOf(exported, fullPath);
                    if (json) yield { sourceFile: fullPath, json };
                }
            }
        }
    }

    private async resolveInstance(
        config: ResolvedSeedcordDevConfig
    ): Promise<TypedOmit<ScanResult, 'commands'> & { commandsDir: string | undefined }> {
        // reading commands.path and emojis constructs the bot, so its lifecycle and plugin setup logs
        // appear here. codegen never starts it, nothing logs in or connects
        this.logger.debug('Loading instance to resolve the commands directory');
        const module = await this.moduleLoader.importModule(config.instance);
        const instance = resolveDefaultExport(module);
        if (!this.isSeedcordInstance(instance)) {
            throw new SeedcordError(SeedcordErrorCode.CliInstanceInvalid);
        }

        // the bot resolves commands.path against cwd
        const commandsPath = instance.config.bot.commands.path;
        return {
            commandsDir: commandsPath ? resolve(process.cwd(), commandsPath) : undefined,
            emojis: instance.config.bot.emojis ?? {},
            augmentTarget: instance.augmentTarget,
            pluginKeys: instance.pluginKeys
        };
    }

    private commandJsonOf(exported: unknown, sourceFile: string): RESTPostAPIApplicationCommandsJSONBody | undefined {
        if (typeof exported !== 'function') return undefined;

        let instance: unknown;
        try {
            instance = new (exported as new () => unknown)();
        } catch (error: unknown) {
            // the commands directory holds helpers and constants too
            if (!Reflect.hasMetadata(CommandMetadataKey, exported)) return undefined;
            const reason = Error.isError(error) ? error.message : 'Unknown error';
            throw new SeedcordError(SeedcordErrorCode.CliCodegenCommandConstructorThrew, [
                exported.name,
                sourceFile,
                reason
            ]);
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
        // chat-input omits type or sets ChatInput, context menus set User or Message
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
        this.logger.info(`Augmentations written to ${outputPath}`);
    }

    private async check(rendered: string, outputPath: string): Promise<void> {
        const onDisk = existsSync(outputPath) ? await readFile(outputPath, 'utf8') : '';
        if (onDisk === rendered) return;

        this.logger.error(`Augmentations are out of date. Run \`seedcord codegen\` and commit ${outputPath}.`);
        process.exitCode = 1;
    }
}
