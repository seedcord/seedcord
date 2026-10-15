import { stripVTControlCharacters } from 'node:util';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { PROCEED } from '#commands/commands/confirm';
import { DeployPresenter } from '#commands/commands/deploy/DeployPresenter';
import { DEPLOY_STEPS, DeployRunner } from '#commands/commands/deploy/DeployRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { APP_ID, Config, fakeDiscord, fakeProject, Ping, pipedTerminal, slash } from '#tests/commands/commands/fakeBot';
import { silentLogger } from '#tests/silentLogger';

import type { Confirm } from '#commands/commands/confirm';
import type { ProjectOpener } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

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
    const stdout = pipedTerminal();
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
        const stdout = pipedTerminal();
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
