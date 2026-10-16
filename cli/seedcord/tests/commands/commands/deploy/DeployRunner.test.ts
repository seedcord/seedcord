import { stripVTControlCharacters } from 'node:util';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { PROCEED } from '#commands/commands/confirm';
import { DeployPresenter } from '#commands/commands/deploy/DeployPresenter';
import { DEPLOY_STEPS, DeployRunner } from '#commands/commands/deploy/DeployRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { lastDeployOf } from '#core/state/deployedCommands';
import { APP_ID, Config, fakeDiscord, fakeProject, Ping, pipedTerminal, slash } from '#tests/commands/commands/fakeBot';
import { silentLogger } from '#tests/silentLogger';

import type { Confirm } from '#commands/commands/confirm';
import type { FakeProject } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

interface DeployOptions {
    verbose?: boolean;
    answer?: boolean;
    confirm?: Confirm;
    yes?: boolean;
}

async function deploy(
    project: FakeProject,
    rest: REST,
    { verbose = false, answer = true, confirm = () => Promise.resolve(answer), yes = false }: DeployOptions = {}
): Promise<string> {
    const stdout = pipedTerminal();
    const printer = new StepPrinter({ command: 'commands', labels: DEPLOY_STEPS, verbose, stdout, stderr: stdout });
    const presenter = new DeployPresenter(printer, yes ? PROCEED : confirm, verbose);
    const runner = new DeployRunner({
        projectLoader: project,
        openDiscord: () => rest,
        logger: silentLogger,
        state: project.state
    });
    await runner.run(presenter, { yes });
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

    it('leaves the global commands alone when the code has none', async () => {
        const { rest, puts } = fakeDiscord({ [Routes.applicationCommands(APP_ID)]: [slash('ban')] });

        const output = await deploy(await fakeProject({ commands: [Config] }), rest);

        expect(puts.map(({ route }) => route)).toEqual([Routes.applicationGuildCommands(APP_ID, '111')]);
        expect(output).not.toContain('/ban');
    });

    it('skips every scope on a second deploy that changed nothing', async () => {
        const project = await fakeProject();
        const { rest, puts } = fakeDiscord();
        await deploy(project, rest);

        const output = await deploy(project, rest, { yes: true });

        expect(puts).toHaveLength(2);
        expect(output).toContain(
            '  Skipped the global commands and the commands in Alpha because they match the last deploy.\n'
        );
        expect(output.trimEnd().split('\n').at(-1)).toBe('  Nothing to deploy.');
    });

    it('says which guilds it skipped when the code has only guild commands', async () => {
        const project = await fakeProject({ commands: [Config] });
        const { rest } = fakeDiscord();
        await deploy(project, rest);

        const output = await deploy(project, rest, { yes: true });

        expect(output).toContain('  Skipped the commands in Alpha because they match the last deploy.\n');
    });

    it('asks once whether to deploy the skipped scopes anyway when every scope is skipped', async () => {
        const project = await fakeProject();
        const { rest, puts } = fakeDiscord();
        await deploy(project, rest);
        const confirm = vi.fn((_message: string) => Promise.resolve(true));

        await deploy(project, rest, { confirm });

        expect(confirm.mock.calls).toEqual([['Deploy them anyway?']]);
        expect(puts.slice(2).map(({ route }) => route)).toEqual([
            Routes.applicationCommands(APP_ID),
            Routes.applicationGuildCommands(APP_ID, '111')
        ]);
    });

    it('deploys nothing when the skipped scopes are declined', async () => {
        const project = await fakeProject();
        const { rest, puts } = fakeDiscord();
        await deploy(project, rest);

        const output = await deploy(project, rest, { answer: false });

        expect(puts).toHaveLength(2);
        expect(output.trimEnd().split('\n').at(-1)).toBe('  Nothing deployed.');
    });

    it('deploys an unchanged scope again when discord no longer has its commands', async () => {
        const project = await fakeProject();
        await deploy(project, fakeDiscord().rest);
        const { rest, puts } = fakeDiscord({ [Routes.applicationCommands(APP_ID)]: [slash('ping')] });

        const output = await deploy(project, rest);

        expect(puts.map(({ route }) => route)).toEqual([Routes.applicationGuildCommands(APP_ID, '111')]);
        expect(output).toContain('  Skipped the global commands because they match the last deploy.\n');
    });

    it('forgets the hash of every scope it was putting when a put fails', async () => {
        const project = await fakeProject();
        await deploy(project, fakeDiscord().rest);
        const { rest } = fakeDiscord();
        const guildRoute = Routes.applicationGuildCommands(APP_ID, '111');
        const put = rest.put.bind(rest);
        vi.spyOn(rest, 'put').mockImplementation((route, options) =>
            route === guildRoute ? Promise.reject(new Error('Internal Server Error')) : put(route, options)
        );

        await expect(deploy(project, rest, { yes: true })).rejects.toThrow();

        expect(lastDeployOf(project.state, APP_ID)?.scopes).toEqual({});
    });

    it('asks again after a declined deploy', async () => {
        const project = await fakeProject();
        const { rest } = fakeDiscord({
            [Routes.applicationCommands(APP_ID)]: [slash('ping')],
            [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('config')]
        });
        await deploy(project, rest, { answer: false });
        const confirm = vi.fn((_message: string) => Promise.resolve(true));

        await deploy(project, rest, { confirm });

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Deploy to 2 scopes?'));
    });

    it('says there is nothing to deploy and asks nothing when the code has no commands', async () => {
        const { rest, puts } = fakeDiscord();
        const confirm = vi.fn((_message: string) => Promise.resolve(true));

        const output = await deploy(await fakeProject({ commands: [] }), rest, { confirm });

        expect(output.trimEnd().split('\n').at(-1)).toBe('  Nothing to deploy.');
        expect(confirm).not.toHaveBeenCalled();
        expect(puts).toEqual([]);
    });

    it('asks about the scopes the preview shows', async () => {
        const { rest } = fakeDiscord();
        const confirm = vi.fn((_message: string) => Promise.resolve(true));

        await deploy(await fakeProject({ commands: [Config] }), rest, { confirm });

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Deploy to 1 scope?'));
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
        const stdout = pipedTerminal();
        const printer = new StepPrinter({
            command: 'commands',
            labels: DEPLOY_STEPS,
            verbose: false,
            stdout,
            stderr: stdout
        });
        const missingToken = new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, ['DISCORD_BOT_TOKEN']);
        const project = await fakeProject();
        const runner = new DeployRunner({
            projectLoader: project,
            openDiscord: () => {
                throw missingToken;
            },
            logger: silentLogger,
            state: project.state
        });

        await expect(runner.run(new DeployPresenter(printer, PROCEED, false))).rejects.toBe(missingToken);
        expect(stdout.text()).toMatch(new RegExp(`${stripVTControlCharacters(paint.cross)} read discord`, 'u'));
    });

    it('prints the rebuild hint after deploying an edge bot', async () => {
        const { rest } = fakeDiscord();

        const output = await deploy(await fakeProject({ edge: true }), rest);

        expect(output).toContain('Run seedcord build and deploy the worker again');
    });

    it('skips the rebuild hint when the deploy adds no command', async () => {
        const { rest } = fakeDiscord({
            [Routes.applicationCommands(APP_ID)]: [slash('ping')],
            [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('config')]
        });

        const output = await deploy(await fakeProject({ edge: true }), rest);

        expect(output).not.toContain('seedcord build');
    });
});
