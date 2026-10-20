import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { HostAugmentTarget, HostPluginKeys, type SeedcordInstance } from '@seedcord/types/internal';
import { posixRelative } from '@seedcord/utils/internal';

import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { plural } from '#core/format';
import { CommandScanner } from '#core/modules/CommandScanner';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';
import { startupShell } from '#core/viteMode';

import { AugmentationBuilder } from './AugmentationBuilder';
import { renderAugmentation } from './renderAugmentation';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { Steps } from '#core/output/Steps';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { ScannedCommand } from './AugmentationBuilder';
import type { ILogger } from '@seedcord/types';

const OUTPUT_FILENAME = 'seedcord-gen.d.ts';

const ENTRY_EXTENSION = /\.[mc]?[jt]sx?$/;

export interface LoadedBot {
    readonly config: ResolvedSeedcordConfig;
    readonly files: ProjectFiles;
    readonly instance: SeedcordInstance;
    readonly modules: ModuleLoader;
}

export const CODEGEN_STEPS = [
    'read config',
    'load plugins',
    'load bot',
    'scan commands',
    'write types',
    'compare types'
] as const;
type CodegenStep = (typeof CODEGEN_STEPS)[number];

interface CodegenResult {
    outputPath: string;
    changed: boolean;
}

interface CodegenRunnerDeps {
    readonly steps: Steps<CodegenStep>;
    readonly projectLoader: ProjectOpener;
    readonly generator: AugmentationBuilder;
    readonly logger: ILogger;
}

// extensionless resolves under moduleResolution bundler, which a seedcord project sets
function botSpecifier(root: string, instance: string): string {
    const posix = posixRelative(root, instance).replace(ENTRY_EXTENSION, '');
    return posix.startsWith('.') ? posix : `./${posix}`;
}

export class CodegenRunner {
    constructor(private readonly deps: CodegenRunnerDeps) {}

    public static create(steps: Steps<CodegenStep>, logger: ILogger, shell = startupShell): CodegenRunner {
        return new CodegenRunner({
            steps,
            projectLoader: new ProjectLoader(openModuleLoader, shell),
            generator: new AugmentationBuilder(logger),
            logger
        });
    }

    public async run(check: boolean): Promise<CodegenResult> {
        const { steps, projectLoader } = this.deps;

        await using project = await openProjectWithSteps(steps, projectLoader);
        const { config, files, modules } = project;
        printResolvedConfig(steps, config);
        const instance = await steps.step('load bot', () => importInstance(modules, config.instance));

        // a bare return disposes the project before the scan's imports run
        return await this.generate({ config, files, instance, modules }, check);
    }

    public async writeFrom(bot: LoadedBot): Promise<CodegenResult> {
        return this.generate(bot, false);
    }

    private async generate({ config, files, instance, modules }: LoadedBot, check: boolean): Promise<CodegenResult> {
        const { steps } = this.deps;
        const commandsPath = instance.config.bot.commands.path;
        const commands = await steps.step(
            'scan commands',
            () => (commandsPath ? new CommandScanner(modules, files).scan(commandsPath) : Promise.resolve([])),
            (found) => paint.mute(plural(found.length, 'command'))
        );

        const outputPath = resolve(config.root, OUTPUT_FILENAME);
        const render = (): string => this.render(config, instance, commands);
        if (check) {
            await steps.step('compare types', () => this.check(render(), outputPath));
            return { outputPath, changed: false };
        }

        const changed = await steps.step('write types', () => this.write(render(), outputPath));
        return { outputPath, changed };
    }

    private render(config: ResolvedSeedcordConfig, instance: SeedcordInstance, commands: ScannedCommand[]): string {
        const emojis = instance.config.bot.emojis ?? {};
        return renderAugmentation(this.deps.generator.generate(commands, emojis), instance[HostAugmentTarget], {
            specifier: botSpecifier(config.root, config.instance),
            keys: instance[HostPluginKeys]
        });
    }

    private async write(rendered: string, outputPath: string): Promise<boolean> {
        if ((await this.onDisk(outputPath)) === rendered) return false; // tsc --watch in dev re-checks on every write
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, rendered, 'utf8');
        return true;
    }

    private async check(rendered: string, outputPath: string): Promise<void> {
        if ((await this.onDisk(outputPath)) !== rendered) {
            throw new SeedcordError(SeedcordErrorCode.CliCodegenOutOfDate, [outputPath]);
        }
    }

    private async onDisk(outputPath: string): Promise<string> {
        return existsSync(outputPath) ? readFile(outputPath, 'utf8') : '';
    }
}
