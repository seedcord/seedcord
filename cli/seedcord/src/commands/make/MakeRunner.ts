import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { validatorFor } from '@seedcord/cli-prompts';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { HostAugmentTarget } from '@seedcord/types/internal';
import { hasErrorCode } from '@seedcord/utils/internal';

import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { plural } from '#core/format';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { directDependencies } from '#core/modules/PackageManifest';
import { startupShell } from '#src/core/ShellMode';

import { findTemplates } from './findTemplates';
import { InputQuestions } from './InputQuestions';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { Answered } from './InputQuestions';
import type { Prompter } from '@seedcord/cli-prompts';
import type { RenderedFile, RenderProject, Template } from '@seedcord/cli-templates';
import type { SeedcordInstance } from '@seedcord/types/internal';

export const MAKE_STEPS = ['read config', 'load plugins', 'find templates', 'load bot', 'write'] as const;
type MakeStep = (typeof MAKE_STEPS)[number];

interface MakeRunnerDeps {
    readonly steps: StepPrinter<MakeStep>;
    readonly prompter: Prompter;
    readonly projectLoader: ProjectOpener;
    readonly interactive: boolean;
}

function renderProjectOf(config: ResolvedSeedcordConfig, instance: SeedcordInstance): RenderProject {
    return {
        root: config.root,
        transport: instance[HostAugmentTarget],
        runtime: config.target.kind,
        helpers: config.make.helpers
    };
}

function assertFree(paths: readonly string[]): void {
    const taken = paths.find((path) => existsSync(path));
    if (taken !== undefined) throw new SeedcordError(SeedcordErrorCode.MakePathTaken, [taken]);
}

async function writeNew({ path, contents }: RenderedFile): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    try {
        await writeFile(path, contents, { flag: 'wx' });
    } catch (error: unknown) {
        if (hasErrorCode(error, 'EEXIST')) throw new SeedcordError(SeedcordErrorCode.MakePathTaken, [path]);
        throw error;
    }
}

export class MakeRunner {
    constructor(private readonly deps: MakeRunnerDeps) {}

    public static create(steps: StepPrinter<MakeStep>, prompter: Prompter, interactive: boolean): MakeRunner {
        return new MakeRunner({
            steps,
            prompter,
            projectLoader: new ProjectLoader(openModuleLoader, startupShell),
            interactive
        });
    }

    public async run(): Promise<void> {
        const { steps, prompter, projectLoader, interactive } = this.deps;
        if (!interactive) throw new SeedcordError(SeedcordErrorCode.MakeNeedsTerminal);

        await using opened = await openProjectWithSteps(steps, projectLoader);
        const { config } = opened;
        const templates = await steps.step(
            'find templates',
            () => findTemplates(config, directDependencies(dirname(config.configFile))),
            (found) => paint.mute(plural(found.length, 'template'))
        );
        if (templates.length === 0) throw new SeedcordError(SeedcordErrorCode.MakeNoTemplates, [config.make.templates]);
        const instance = await steps.step('load bot', () => importInstance(opened.modules, config.instance));

        const answered: Answered = (label, shown) => steps.line(`${paint.mint(paint.check)} ${label}  ${shown}`);
        const project = renderProjectOf(config, instance);
        const template = await this.pickTemplate(templates);
        answered('template', template.name);
        const name = await prompter.text({
            message: 'Name',
            placeholder: 'like RollDice, or tickets/Appeal for a subfolder',
            validate: validatorFor([SeedcordErrorCode.MakeInvalidName, SeedcordErrorCode.MakePathTaken], (value) =>
                assertFree(template.output(value, project).paths)
            )
        });
        answered('name', name);
        const output = template.output(name, project);
        const files = output.render(await new InputQuestions(prompter, answered).ask(output.inputs()));

        await steps.step(
            'write',
            async () => {
                for (const file of files) await writeNew(file);
            },
            () => paint.mute(plural(files.length, 'file')),
            () => files.map((file) => paint.path(file.path))
        );
        steps.line();
        steps.line(
            paint.mute(
                `Run ${paint.bold('seedcord codegen')}, or keep ${paint.bold('seedcord dev')} running, to type new routes.`
            )
        );
    }

    private async pickTemplate(templates: readonly Template[]): Promise<Template> {
        const picked = await this.deps.prompter.select({
            message: 'Which template?',
            choices: templates.map(({ name, from }, index) => ({ value: String(index), label: name, hint: from }))
        });
        // justified: every value is an index into templates
        return templates[Number(picked)] as Template;
    }
}
