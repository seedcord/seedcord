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
import { plural } from '#core/format';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

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

export const CODEGEN_STEPS = ['read config', 'load bot', 'scan commands', 'write types', 'compare types'] as const;
type CodegenStep = (typeof CODEGEN_STEPS)[number];

interface CodegenResult {
    outputPath: string;
}

interface CodegenRunnerDeps {
    readonly steps: Steps<CodegenStep>;
    readonly configLoader: ConfigLoader;
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

    public static create(steps: Steps<CodegenStep>, logger: ILogger): CodegenRunner {
        return new CodegenRunner({
            steps,
            configLoader: new ConfigLoader(openModuleLoader),
            generator: new AugmentationBuilder(logger),
            logger
        });
    }

    public async run(check: boolean): Promise<CodegenResult> {
        const { steps, configLoader } = this.deps;

        await using project = await steps.step('read config', () => configLoader.load());
        const { config, modules } = project;
        printResolvedConfig(steps, config);
        const instance = await steps.step('load bot', () => this.resolveInstance(modules, config));
        const commands = await steps.step(
            'scan commands',
            () => (instance.commandsDir ? this.scanCommands(modules, instance.commandsDir) : Promise.resolve([])),
            (found) => paint.mute(plural(found.length, 'command'))
        );

        const outputPath = resolve(config.root, OUTPUT_FILENAME);
        const render = (): string => this.render(config, instance, commands);
        if (check) await steps.step('compare types', () => this.check(render(), outputPath));
        else await steps.step('write types', () => this.write(render(), outputPath));

        return { outputPath };
    }

    private render(config: ResolvedSeedcordDevConfig, instance: ResolvedInstance, commands: ScannedCommand[]): string {
        return renderAugmentation(this.deps.generator.generate(commands, instance.emojis), instance.augmentTarget, {
            specifier: botSpecifier(config.root, config.instance),
            keys: instance.pluginKeys
        });
    }

    private async scanCommands(modules: ModuleLoader, commandsDir: string): Promise<ScannedCommand[]> {
        const commands: ScannedCommand[] = [];
        const problems: unknown[] = [];
        try {
            for await (const commandClass of this.walk(modules, commandsDir, new Set(), true)) {
                const built = this.construct(commandClass);
                if (isSeedcordError(built)) problems.push(built);
                else if (built) commands.push(built);
            }
        } catch (error: unknown) {
            // the walk stops at the first file that fails to import
            problems.push(error);
        }

        throwSingleOrAggregate(problems, SeedcordErrorCode.CliCodegenCommandProblems);
        return commands;
    }

    private async *walk(
        modules: ModuleLoader,
        dir: string,
        seen: Set<unknown>,
        isRoot: boolean
    ): AsyncGenerator<CommandClassFile> {
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

        // readdir order differs between filesystems
        for (const entry of entries.toSorted((a, b) => a.name.localeCompare(b.name))) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* this.walk(modules, fullPath, seen, false);
            } else if (isTsOrJsFile(entry)) {
                const imported = await modules.importModule<Record<string, unknown>>(fullPath);
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

    private async resolveInstance(modules: ModuleLoader, config: ResolvedSeedcordDevConfig): Promise<ResolvedInstance> {
        const instance = await importInstance(modules, config.instance);

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
            return new SeedcordError(
                SeedcordErrorCode.CliCodegenCommandConstructorThrew,
                [Command.name, sourceFile, reason],
                { cause: error }
            );
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
