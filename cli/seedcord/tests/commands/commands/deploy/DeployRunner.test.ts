import { EventEmitter } from 'node:events';
import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { SeedcordBrand } from '@seedcord/types/internal';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { PROCEED } from '#commands/commands/confirm';
import { DeployPresenter } from '#commands/commands/deploy/DeployPresenter';
import { DEPLOY_STEPS, DeployRunner } from '#commands/commands/deploy/DeployRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { Project } from '#core/project/Project';
import { silentLogger } from '#tests/silentLogger';

import type { Confirm } from '#commands/commands/confirm';
import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { Terminal } from '#core/output/terminal';
import type { REST } from '@discordjs/rest';

const APP_ID = 'app-1';

class Ping extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('ping').setDescription('Replies with pong');
    }
}
RegisterCommand('global')(Ping);

class Config extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('config').setDescription('Settings');
    }
}
RegisterCommand('guild', ['111'])(Config);

type CommandClass = new () => BuilderComponent<'command'>;

interface BotOptions {
    commands?: CommandClass[];
    commandsPath?: string | null;
    edge?: boolean;
}

function slash(name: string): { id: string; name: string; type: ApplicationCommandType } {
    return { id: `${name}-id`, name, type: ApplicationCommandType.ChatInput };
}

type ProjectOpener = Pick<ProjectLoader, 'open'>;

interface FakeDiscord {
    rest: REST;
    puts: { route: string; names: string[] }[];
}

async function fakeProject({
    commands = [Ping, Config],
    commandsPath = './commands',
    edge = false
}: BotOptions = {}): Promise<ProjectOpener> {
    const dir = await mkdtempDisposable(join(tmpdir(), 'deploy-'));
    onTestFinished(() => dir.remove());
    const root = dir.path;
    await mkdir(join(root, 'commands'));
    const byPath = new Map<string, Record<string, unknown>>();
    for (const Command of commands) {
        const file = join(root, 'commands', `${Command.name}.ts`);
        await writeFile(file, '');
        byPath.set(file, { [Command.name]: Command });
    }

    const instance = resolve(root, 'bot.ts');
    byPath.set(instance, {
        default: { [SeedcordBrand]: true, config: { bot: { commands: { path: commandsPath, guilds: [] } } } }
    });

    // justified: deploy reads only these paths off the config
    const config = {
        root,
        instance,
        configFile: resolve(root, 'seedcord.config.ts'),
        target: edge
            ? { kind: 'edge', wranglerConfig: resolve(root, 'wrangler.jsonc') }
            : { kind: 'server', entry: resolve(root, 'index.ts') },
        build: { outDir: resolve(root, 'dist') }
    } as ResolvedSeedcordConfig;
    // justified: deploy reads only importModule off the loader
    const modules = {
        importModule: (path: string) => Promise.resolve(byPath.get(path) ?? {}),
        [Symbol.asyncDispose]: () => Promise.resolve()
    } as ModuleLoader & AsyncDisposable;
    return { open: () => Promise.resolve(new Project(config, modules)) };
}

function fakeDiscord(onDiscord: Record<string, unknown[]> = {}): FakeDiscord {
    const puts: FakeDiscord['puts'] = [];
    const answers: Record<string, unknown> = {
        [Routes.currentApplication()]: { id: APP_ID },
        [Routes.applicationCommands(APP_ID)]: [],
        [Routes.guild('111')]: { id: '111', name: 'Alpha' },
        [Routes.applicationGuildCommands(APP_ID, '111')]: [],
        ...onDiscord
    };
    const rest = Object.assign(new EventEmitter(), {
        get: vi.fn((route: string) => Promise.resolve(answers[route])),
        put: vi.fn((route: string, { body }: { body: { name: string }[] }) => {
            puts.push({ route, names: body.map((command) => command.name) });
            return Promise.resolve([]);
        })
    });
    // justified: deploy calls only get, put, on and off
    return { rest: rest as unknown as REST, puts };
}

function terminal(): Terminal & { text: () => string } {
    let written = '';
    return {
        isTTY: false,
        columns: 0,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        },
        text: () => stripVTControlCharacters(written).replaceAll(' ', ' ')
    };
}

interface DeployOptions {
    verbose?: boolean;
    answer?: boolean;
    confirm?: Confirm;
}

async function deploy(
    project: ProjectOpener,
    rest: REST,
    { verbose = false, answer = true, confirm = () => Promise.resolve(answer) }: DeployOptions = {}
): Promise<string> {
    const stdout = terminal();
    const printer = new StepPrinter({ command: 'commands', labels: DEPLOY_STEPS, verbose, stdout, stderr: stdout });
    const presenter = new DeployPresenter(printer, confirm, verbose);
    await new DeployRunner({ projectLoader: project, openDiscord: () => rest, logger: silentLogger }).run(presenter);
    return stdout.text();
}

describe('DeployRunner', () => {
    it('puts every scope the code has, global first', async () => {
        const { rest, puts } = fakeDiscord();

        await deploy(await fakeProject(), rest);

        expect(puts).toEqual([
            { route: Routes.applicationCommands(APP_ID), names: ['ping'] },
            { route: Routes.applicationGuildCommands(APP_ID, '111'), names: ['config'] }
        ]);
    });

    it('counts only global commands when the code targets no guild', async () => {
        const { rest } = fakeDiscord();

        const output = await deploy(await fakeProject({ commands: [Ping] }), rest);

        expect(output).toMatch(/deploy +\S+ +1 global\n/u);
    });

    it('prints what each scope gains and loses, and counts the commands that stay', async () => {
        const { rest } = fakeDiscord({ [Routes.applicationCommands(APP_ID)]: [slash('ping'), slash('legacy')] });

        const output = await deploy(await fakeProject(), rest);

        expect(output).toContain(
            ['  global  1 command', '    - /legacy', '      1 kept', '', '  Alpha  1 command', '    + /config'].join(
                '\n'
            )
        );
        expect(output).toMatch(/deploy +\S+ +1 global, 1 in 1 guild/u);
    });

    it('says when a scope gains and loses nothing', async () => {
        const { rest } = fakeDiscord({ [Routes.applicationCommands(APP_ID)]: [slash('ping')] });

        const output = await deploy(await fakeProject({ commands: [Ping] }), rest);

        expect(output).toContain('  global  1 command, none added or removed\n');
    });

    it('lists the kept commands under --verbose', async () => {
        const { rest } = fakeDiscord({ [Routes.applicationCommands(APP_ID)]: [slash('ping'), slash('legacy')] });

        const output = await deploy(await fakeProject(), rest, { verbose: true });

        expect(output).toContain('    - /legacy\n      /ping\n');
    });

    it('clears the global scope when the code has no global commands', async () => {
        const { rest, puts } = fakeDiscord({ [Routes.applicationCommands(APP_ID)]: [slash('ban')] });

        const output = await deploy(await fakeProject({ commands: [Config] }), rest);

        expect(puts[0]).toEqual({ route: Routes.applicationCommands(APP_ID), names: [] });
        expect(output).toContain('  global  0 commands\n    - /ban\n');
    });

    it('deploys nothing and says so when the deploy is declined', async () => {
        const { rest, puts } = fakeDiscord();

        const output = await deploy(await fakeProject(), rest, { answer: false });

        expect(puts).toEqual([]);
        expect(output.trimEnd().split('\n').at(-1)).toBe('  Nothing deployed.');
    });

    it('deploys nothing and prints cancelled when the question is cancelled', async () => {
        const { rest, puts } = fakeDiscord();

        const output = await deploy(await fakeProject(), rest, {
            confirm: () => Promise.reject(new SeedcordError(SeedcordErrorCode.CliCancelled))
        });

        expect(puts).toEqual([]);
        expect(output.trimEnd().split('\n').at(-1)).toBe('  cancelled');
    });

    it('throws CliDeployNoCommandsFolder and sends nothing when the bot has no commands folder', async () => {
        const { rest, puts } = fakeDiscord();

        const deploying = deploy(await fakeProject({ commandsPath: null }), rest);

        await expect(deploying).rejects.toMatchObject({ code: SeedcordErrorCode.CliDeployNoCommandsFolder });
        expect(puts).toEqual([]);
    });

    it('fails the read discord step when the token is missing', async () => {
        const stdout = terminal();
        const printer = new StepPrinter({
            command: 'commands',
            labels: DEPLOY_STEPS,
            verbose: false,
            stdout,
            stderr: stdout
        });
        const missingToken = new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, ['DISCORD_BOT_TOKEN']);
        const runner = new DeployRunner({
            projectLoader: await fakeProject(),
            openDiscord: () => {
                throw missingToken;
            },
            logger: silentLogger
        });

        await expect(runner.run(new DeployPresenter(printer, PROCEED, false))).rejects.toBe(missingToken);
        expect(stdout.text()).toMatch(new RegExp(`${stripVTControlCharacters(paint.cross)} read discord`, 'u'));
    });

    it('prints the rebuild hint after deploying an edge bot', async () => {
        const { rest } = fakeDiscord();

        const output = await deploy(await fakeProject({ edge: true }), rest);

        expect(output).toContain('Run seedcord build and deploy the worker again');
    });
});
