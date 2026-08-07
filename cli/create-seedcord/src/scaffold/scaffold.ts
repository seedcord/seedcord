import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { addCommand, runPrefix } from '@cli/packageManager';
import { gitPlanFrom, probeGit } from '@scaffold/git';
import { claimTarget } from '@scaffold/target';
import { buildContext } from '@template/context';
import { renderTemplates } from '@template/render';

import type { ScaffoldAnswers } from '@template/context';
import type { AgentName } from 'package-manager-detector';

export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<void>;

export interface ScaffoldInput {
    target: string;
    templatesRoot: string;
    answers: ScaffoldAnswers;
    agent: AgentName;
    install: boolean;
    git: boolean;
}

export interface ScaffoldResult {
    installed: boolean;
    committed: boolean;
    gitNotice: string | null;
}

// @seedcord/tsconfig sets types: ['node'], and tsc fails outright without the package behind it
const DEV_PACKAGES = [
    '@seedcord/eslint-config',
    '@seedcord/tsconfig',
    '@types/node',
    'prettier',
    'seedcord',
    // typescript-eslint 8 declares typescript >=4.8.4 <6.1.0, and typescript 7.0 ships no compiler api at all
    'typescript@~6.0'
];
const SHARED_PACKAGES = ['@discordjs/builders', 'envapt'];

function runtimePackages(isGateway: boolean): string[] {
    const transport = isGateway ? ['@seedcord/gateway', 'discord.js'] : ['@seedcord/http'];
    return [...transport, ...SHARED_PACKAGES];
}

async function writeTree(target: string, files: { path: string; contents: string }[]): Promise<void> {
    for (const file of files) {
        const destination = join(target, file.path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, file.contents, 'utf8');
    }
}

export async function scaffold(input: ScaffoldInput, run: CommandRunner): Promise<ScaffoldResult> {
    const { existed } = await claimTarget(input.target);
    const plan = gitPlanFrom(await probeGit(dirname(input.target)), input.git);

    try {
        const context = buildContext(input.answers, {
            developerUsername: plan.developerUsername,
            runCommand: runPrefix(input.agent)
        });

        await mkdir(input.target, { recursive: true });
        await writeTree(input.target, await renderTemplates(input.templatesRoot, context));

        if (input.install) {
            const deps = addCommand(input.agent, runtimePackages(context.isGateway), false);
            const dev = addCommand(input.agent, DEV_PACKAGES, true);

            await run(deps.command, deps.args, input.target);
            await run(dev.command, dev.args, input.target);

            // format runs after install because prettier arrives with it
            await run(input.agent, ['exec', 'prettier', '--write', '.'], input.target);
            await run(input.agent, ['exec', 'seedcord', 'codegen'], input.target);
        }

        if (plan.init) {
            await run('git', ['init'], input.target);
            await run('git', ['add', '.'], input.target);
            await run('git', ['commit', '-m', 'chore: create seedcord bot'], input.target);
        }

        return { installed: input.install, committed: plan.init, gitNotice: plan.notice };
    } catch (error) {
        await rm(input.target, { recursive: true, force: true });
        if (existed) await mkdir(input.target, { recursive: true });

        throw error;
    }
}
