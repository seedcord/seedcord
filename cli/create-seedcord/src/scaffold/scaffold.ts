import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { execCommand } from '#cli/packageManager';
import { dependencyCommands, lockfileDependencyCommands } from '#scaffold/dependencies';
import { gitPlanFrom, probeGit } from '#scaffold/git';
import { claimTarget } from '#scaffold/target';
import { buildContext } from '#template/context';
import { copyStarters, renderTemplates } from '#template/render';

import type { StepLabel, StepUi } from '#cli/steps';
import type { GitPlan } from '#scaffold/git';
import type { ScaffoldAnswers, TemplateContext } from '#template/context';
import type { AgentName, ResolvedCommand } from 'package-manager-detector';

// the resolved string is a warning worth printing
export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<string | null>;

export interface ScaffoldInput {
    target: string;
    templatesRoot: string;
    startersRoot: string;
    answers: ScaffoldAnswers;
    agent: AgentName;
    steps: StepUi;
}

export type ScaffoldResult =
    | { created: false }
    | {
          created: true;
          installed: boolean;
          notices: string[];
          failed: boolean;
      };

async function writeTree(target: string, files: { path: string; contents: string }[]): Promise<void> {
    for (const file of files) {
        const destination = join(target, file.path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, file.contents, 'utf8');
    }
}

// a throw here would cut the summary in index.ts short
async function succeeded(steps: StepUi, label: StepLabel, work: () => Promise<unknown>): Promise<boolean> {
    try {
        await steps.run(label, work);
        return true;
    } catch {
        // StepUi already printed the failure
        return false;
    }
}

async function gitNoticeFor(input: ScaffoldInput, run: CommandRunner, plan: GitPlan): Promise<string | null> {
    if (!plan.init) {
        input.steps.skip('git');
        return plan.notice;
    }

    const committed = await succeeded(input.steps, 'git', async () => {
        await run('git', ['init'], input.target);
        await run('git', ['add', '.'], input.target);
        await run('git', ['commit', '-m', 'chore: create seedcord bot'], input.target);
    });

    return committed ? plan.notice : 'The project is complete and uncommitted.';
}

interface InstallOutcome {
    installed: boolean;
    notices: string[];
    failed: boolean;
}

function skipInstallSteps(steps: StepUi): InstallOutcome {
    for (const label of ['deps', 'format', 'types'] as const) steps.skip(label);

    return { installed: false, notices: [], failed: false };
}

interface AddOutcome {
    added: boolean;
    notices: string[];
}

async function runAdds(
    steps: StepUi,
    run: CommandRunner,
    target: string,
    commands: readonly ResolvedCommand[]
): Promise<AddOutcome> {
    const notices: string[] = [];
    const collect = (warning: string | null): void => {
        if (warning !== null) notices.push(warning);
    };

    const added = await succeeded(steps, 'deps', async () => {
        for (const command of commands) collect(await run(command.command, command.args, target));
    });

    return { added, notices };
}

async function runInstallSteps(
    input: ScaffoldInput,
    run: CommandRunner,
    context: TemplateContext
): Promise<InstallOutcome> {
    const { agent, steps, target } = input;

    const format = execCommand(agent, ['prettier', '--write', '.']);
    const codegen = execCommand(agent, ['seedcord', 'codegen']);
    const { added, notices } = await runAdds(
        steps,
        run,
        target,
        dependencyCommands(agent, context.isGateway, context.isEdge)
    );

    // npx and bun x fetch a missing binary from the registry
    if (!added) {
        steps.skip('format');
        steps.skip('types');

        return { installed: false, notices, failed: true };
    }

    const formatted = await succeeded(steps, 'format', () => run(format.command, format.args, target));
    const generated = await succeeded(steps, 'types', async () => {
        await run(codegen.command, codegen.args, target);
        if (!context.isEdge) return;

        // pnpm and npm skip the project's postinstall on an add
        const bindingTypes = execCommand(agent, ['cf', 'workers', 'types']);
        await run(bindingTypes.command, bindingTypes.args, target);
    });

    return { installed: true, notices, failed: !formatted || !generated };
}

async function resolveDependencies(
    input: ScaffoldInput,
    run: CommandRunner,
    context: TemplateContext
): Promise<InstallOutcome> {
    const commands = lockfileDependencyCommands(input.agent, context.isGateway, context.isEdge);
    if (commands === null) return skipInstallSteps(input.steps);

    const { added, notices } = await runAdds(input.steps, run, input.target, commands);

    input.steps.skip('format');
    input.steps.skip('types');

    return { installed: false, notices, failed: !added };
}

// scaffold deletes this directory when writing fails; every step after it keeps the tree
async function writeProject(input: ScaffoldInput, context: TemplateContext, existed: boolean): Promise<boolean> {
    const written = await succeeded(input.steps, 'files', async () => {
        await mkdir(input.target, { recursive: true });
        const files = await Promise.all([
            renderTemplates(input.templatesRoot, context),
            copyStarters(input.startersRoot, context)
        ]);
        await writeTree(input.target, files.flat());
    });

    if (!written) {
        await rm(input.target, { recursive: true, force: true });
        // claimTarget refuses a non-empty target
        if (existed) await mkdir(input.target, { recursive: true });
    }

    return written;
}

export async function scaffold(input: ScaffoldInput, run: CommandRunner): Promise<ScaffoldResult> {
    const { existed } = claimTarget(input.target);

    // execFile rejects when cwd does not exist
    const parent = dirname(input.target);
    await mkdir(parent, { recursive: true });

    const plan = gitPlanFrom(await probeGit(parent), input.answers.git);
    const context = buildContext(input.answers, { developerUsername: plan.developerUsername, agent: input.agent });
    if (!(await writeProject(input, context, existed))) return { created: false };

    const outcome = input.answers.install
        ? await runInstallSteps(input, run, context)
        : await resolveDependencies(input, run, context);

    const gitNotice = await gitNoticeFor(input, run, plan);

    return {
        created: true,
        installed: outcome.installed,
        notices: gitNotice === null ? outcome.notices : [...outcome.notices, gitNotice],
        failed: outcome.failed
    };
}
