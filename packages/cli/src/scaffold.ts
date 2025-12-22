import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import * as p from '@clack/prompts';
import merge from 'lodash.merge';

import { formatDir, copyDir, spawnProcess, colors } from './utils';

interface Spinner {
    start: (msg?: string) => void;
    stop: (msg?: string, code?: number) => void;
    message: (msg?: string) => void;
}

const packageManager = fetchPackageManager() ?? 'npm';

const prompts: p.PromptGroup<{
    path: string | symbol;
    projectTools: string[] | symbol;
    installDeps: boolean | symbol;
}> = {
    path: () =>
        p.text({
            message: 'Where should we create your project?',
            placeholder: 'seedcord-project',
            validate: (value) => {
                if (!value) return 'Please enter a path.';
                // TODO: add prompt for overwriting directory
                if (existsSync(value)) return 'folder already exists';
                return undefined;
            }
        }),
    projectTools: () =>
        p.multiselect({
            message: 'Select additional tools.',
            initialValues: ['prettier'],
            required: false,
            options: [
                // TODO: add more tools
                { value: 'prettier', label: 'Prettier', hint: 'recommended' }
            ]
        }),
    installDeps: () =>
        p.confirm({
            message: `Install dependencies with ${packageManager}?`,
            initialValue: false
        })
};

const additionalTools: Record<string, Record<string, unknown>> = {
    prettier: {
        scripts: {
            fmt: "prettier --write 'src/**/*.{ts,tsx,json,md}' --cache",
            'fmt:check': "prettier --check 'src/**/*.{ts,tsx,json,md}' --cache"
        },
        devDependencies: {
            prettier: '^3.6.2'
        }
    }
};

export async function scaffoldQuestions(): Promise<void> {
    p.updateSettings({
        aliases: {
            w: 'up',
            s: 'down',
            a: 'left',
            d: 'right'
        }
    });

    p.intro(`${colors.bgCyan(colors.black(' seedcord wizard '))}`);

    const project = await p.group(prompts, {
        onCancel: () => {
            p.cancel('Operation cancelled.');
            process.exit(0);
        }
    });
    await scaffoldProject(project, p);
    const nextSteps =
        `cd ${project.path}\n` +
        `${project.installDeps ? '' : `${packageManager} install\n`}` +
        `fill .env.example and rename it to .env\n` +
        `${packageManager} dev`;
    p.note(nextSteps, 'Next steps.');
    p.outro(`Problems? ${colors.underline(colors.cyan('https://github.com/materwelondhruv/seedcord/issues'))}`);
}

export async function scaffoldProject(
    project: { path: string; projectTools: string[]; installDeps: boolean },
    clack: typeof p
): Promise<void> {
    const root = join(process.cwd(), formatDir(project.path));
    const templateDir = resolve(fileURLToPath(import.meta.url), '../../template');

    await extractBaseTemplate(templateDir, root, clack.spinner());

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const tools = project.projectTools || [];

    if (tools.length > 0) await extractTools(root, tools, clack.spinner());
    if (project.installDeps) await installPackages(root, packageManager, clack.spinner());
}

function fetchPackageManager(): string | undefined {
    const agent = process.env.npm_config_user_agent;
    return agent?.split(' ')[0]?.split('/')[0];
}

async function extractTools(root: string, tools: string[], spinner: Spinner): Promise<void> {
    spinner.start(`Adding additional tools`);
    const packagePath = resolve(root, './package.json');
    let packageJson = JSON.parse(await readFile(packagePath, 'utf-8')) as Record<string, unknown>;
    for (const tool of tools) {
        packageJson = installTool(tool, packageJson);
    }
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf-8');
    spinner.stop('Added tools');
}

async function extractBaseTemplate(base: string, to: string, spinner: Spinner): Promise<void> {
    spinner.start('extracting base files');
    await mkdir(to, { recursive: true });
    await copyDir(base, to);
    await rename(`${to}/_gitignore`, `${to}/.gitignore`);
    spinner.stop('extracted base files');
}

async function installPackages(root: string, packageManager: string, spinner: Spinner): Promise<void> {
    spinner.start(`Installing via ${packageManager}`);
    await setTimeout(1000);
    await spawnProcess(`${packageManager}`, ['install'], {
        cwd: root
    });
    spinner.stop(`Installed via ${packageManager}`);
}

function installTool(tool: string, packageJson: Record<string, unknown>): Record<string, unknown> {
    const toolObject = additionalTools[tool];
    if (!toolObject) throw new Error(`unable to find tool ${tool}`);
    return merge<Record<string, unknown>, Record<string, unknown>>(packageJson, toolObject);
}
