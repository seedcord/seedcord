import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { isCommandClass } from '@seedcord/core/internal';
import { SeedcordErrorCode, isSeedcordError, paint } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { HostAugmentTarget, HostPluginKeys } from '@seedcord/types/internal';
import { isTsOrJsFile } from '@seedcord/utils/node';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { ConfigLoader } from '#core/config/ConfigLoader';
import { ConfigLocator } from '#core/config/ConfigLocator';
import { plural } from '#core/format';
import { importInstance } from '#core/modules/importInstance';
import { RuntimeModuleLoader } from '#core/modules/RuntimeModuleLoader';

import { AugmentationBuilder } from './AugmentationBuilder';
import { renderAugmentation } from './renderAugmentation';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { Steps } from '#core/output/Steps';
import type { ScannedCommand } from './AugmentationBuilder';
import type { CommandCtor } from '@seedcord/core/internal';
import type { EmojiConfig, ILogger } from '@seedcord/types';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

const OUTPUT_FILENAME = 'seedcord-gen.d.ts';

const ENTRY_EXTENSION = /\.[mc]?[jt]sx?$/;

interface CommandClassFile {
    sourceFile: string;
    Command: CommandCtor;
}

interface ResolvedInstance {
    commandsDir: string | undefined;
    emojis: EmojiConfig;
    augmentTarget: string;
    pluginKeys: readonly string[];
}

export const CODEGEN_STEPS = ['read config', 'load bot', 'scan commands', 'write types', 'check types'] as const;
export type CodegenStep = (typeof CODEGEN_STEPS)[number];

export interface CodegenResult {
    outputPath: string;
}

interface CodegenRunnerDeps {
    readonly steps: Steps<CodegenStep>;
    readonly locator: ConfigLocator;
    readonly configLoader: ConfigLoader;
    readonly moduleLoader: ModuleLoader;
    readonly generator: AugmentationBuilder;
    readonly logger: ILogger;
}

// extensionless resolves under moduleResolution bundler, which a seedcord project sets
function botSpecifier(root: string, instance: string): string {
    const posix = relative(root, instance).split(sep).join('/').replace(ENTRY_EXTENSION, '');
    return posix.startsWith('.') ? posix : `./${posix}`;
}

export class CodegenRunner {
    constructor(private readonly deps: CodegenRunnerDeps) {}

    // scan warnings go through the logger
    public static create(steps: Steps<CodegenStep>, logger: ILogger): CodegenRunner {
        const moduleLoader = new RuntimeModuleLoader();

        return new CodegenRunner({
            steps,
            locator: new ConfigLocator(),
            configLoader: new ConfigLoader(moduleLoader),
            moduleLoader,
            generator: new AugmentationBuilder(logger),
            logger
        });
    }

    public async run(check: boolean): Promise<CodegenResult> {
        const { steps, configLoader, locator } = this.deps;

        const config = await steps.step('config', () => configLoader.load(locator.locate()));
        const instance = await steps.step('bot', () => this.resolveInstance(config));
        const commands = await steps.step(
            'commands',
            () => (instance.commandsDir ? this.scanCommands(instance.commandsDir) : Promise.resolve([])),
            (found) => paint.mute(plural(found.length, 'command'))
        );

        const outputPath = resolve(config.root, OUTPUT_FILENAME);
        const render = (): string => this.render(config, instance, commands);
        if (check) await steps.step('check', () => this.check(render(), outputPath));
        else await steps.step('write', () => this.write(render(), outputPath));

        return { outputPath };
    }

    private render(config: ResolvedSeedcordDevConfig, instance: ResolvedInstance, commands: ScannedCommand[]): string {
        return renderAugmentation(this.deps.generator.generate(commands, instance.emojis), instance.augmentTarget, {
            specifier: botSpecifier(config.root, config.instance),
            keys: instance.pluginKeys
        });
    }

    private async scanCommands(commandsDir: string): Promise<ScannedCommand[]> {
        const commands: ScannedCommand[] = [];
        const problems: SeedcordError[] = [];
        for await (const commandClass of this.walk(commandsDir, new Set(), true)) {
            const built = this.construct(commandClass);
            if (isSeedcordError(built)) problems.push(built);
            else if (built) commands.push(built);
        }

        throwSingleOrAggregate(problems, SeedcordErrorCode.CliCodegenCommandProblems);
        return commands;
    }

    // the bot scans under tsx/vite where import() takes a .ts path. codegen runs under plain node, hence the
    // tsx-backed module loader below.
    private async *walk(dir: string, seen: Set<unknown>, isRoot: boolean): AsyncGenerator<CommandClassFile> {
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown error';
            // an unreadable commands dir would pass --check against a stale registry
            if (isRoot) throw new SeedcordError(SeedcordErrorCode.CliCodegenCommandsDirUnreadable, [dir, reason]);
            this.deps.logger.warn(`Skipping unreadable directory ${dir}. ${reason}.`);
            return;
        }

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* this.walk(fullPath, seen, false);
            } else if (isTsOrJsFile(entry)) {
                const imported = await this.deps.moduleLoader.importModule<Record<string, unknown>>(fullPath);
                for (const exported of Object.values(imported)) {
                    // a barrel re-exports the same class object
                    if (seen.has(exported)) continue;
                    seen.add(exported);
                    // the commands directory holds helpers and constants too
                    if (isCommandClass(exported)) yield { sourceFile: fullPath, Command: exported };
                }
            }
        }
    }

    private async resolveInstance(config: ResolvedSeedcordDevConfig): Promise<ResolvedInstance> {
        const instance = await importInstance(this.deps.moduleLoader, config.instance);

        // the bot resolves commands.path against cwd
        const commandsPath = instance.config.bot.commands.path;
        return {
            commandsDir: commandsPath ? resolve(process.cwd(), commandsPath) : undefined,
            emojis: instance.config.bot.emojis ?? {},
            augmentTarget: instance[HostAugmentTarget],
            pluginKeys: instance[HostPluginKeys]
        };
    }

    private construct({ sourceFile, Command }: CommandClassFile): ScannedCommand | SeedcordError | undefined {
        let json: unknown;
        try {
            json = new Command().component.toJSON();
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown error';
            return new SeedcordError(SeedcordErrorCode.CliCodegenCommandConstructorThrew, [
                Command.name,
                sourceFile,
                reason
            ]);
        }

        return this.isApplicationCommand(json) ? { sourceFile, json } : undefined;
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

    private async write(rendered: string, outputPath: string): Promise<void> {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, rendered, 'utf8');
    }

    private async check(rendered: string, outputPath: string): Promise<void> {
        const onDisk = existsSync(outputPath) ? await readFile(outputPath, 'utf8') : '';
        if (onDisk !== rendered) throw new SeedcordError(SeedcordErrorCode.CliCodegenOutOfDate, [outputPath]);
    }
}
