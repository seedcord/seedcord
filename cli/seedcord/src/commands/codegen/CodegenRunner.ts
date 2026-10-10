import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { HostAugmentTarget, HostPluginKeys } from '@seedcord/types/internal';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { plural } from '#core/format';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import { AugmentationBuilder } from './AugmentationBuilder';
import { CommandScanner } from './CommandScanner';
import { renderAugmentation } from './renderAugmentation';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { ScannedCommand } from './AugmentationBuilder';
import type { EmojiConfig, ILogger } from '@seedcord/types';

const OUTPUT_FILENAME = 'seedcord-gen.d.ts';

const ENTRY_EXTENSION = /\.[mc]?[jt]sx?$/;

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
    readonly projectLoader: ProjectLoader;
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
            projectLoader: new ProjectLoader(openModuleLoader),
            generator: new AugmentationBuilder(logger),
            logger
        });
    }

    public async run(check: boolean): Promise<CodegenResult> {
        const { steps, projectLoader } = this.deps;

        await using project = await steps.step('read config', () => projectLoader.open());
        const { config, modules } = project;
        printResolvedConfig(steps, config);
        const instance = await steps.step('load bot', () => this.resolveInstance(project));
        const commands = await steps.step(
            'scan commands',
            () =>
                instance.commandsDir
                    ? new CommandScanner(modules, this.deps.logger).scan(instance.commandsDir)
                    : Promise.resolve([]),
            (found) => paint.mute(plural(found.length, 'command'))
        );

        const outputPath = resolve(config.root, OUTPUT_FILENAME);
        const render = (): string => this.render(config, instance, commands);
        if (check) await steps.step('compare types', () => this.check(render(), outputPath));
        else await steps.step('write types', () => this.write(render(), outputPath));

        return { outputPath };
    }

    private render(config: ResolvedSeedcordConfig, instance: ResolvedInstance, commands: ScannedCommand[]): string {
        return renderAugmentation(this.deps.generator.generate(commands, instance.emojis), instance.augmentTarget, {
            specifier: botSpecifier(config.root, config.instance),
            keys: instance.pluginKeys
        });
    }

    private async resolveInstance({ modules, config }: Project): Promise<ResolvedInstance> {
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

    private async write(rendered: string, outputPath: string): Promise<void> {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, rendered, 'utf8');
    }

    private async check(rendered: string, outputPath: string): Promise<void> {
        const onDisk = existsSync(outputPath) ? await readFile(outputPath, 'utf8') : '';
        if (onDisk !== rendered) throw new SeedcordError(SeedcordErrorCode.CliCodegenOutOfDate, [outputPath]);
    }
}
