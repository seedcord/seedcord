import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandOptionType, Routes } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { listingJson } from '#commands/commands/list/listingJson';
import { ListPresenter } from '#commands/commands/list/ListPresenter';
import { LIST_STEPS, ListRunner } from '#commands/commands/list/ListRunner';
import { defaultRunnerDeps } from '#commands/commands/runnerDeps';
import { quietSteps } from '#core/output/quietSteps';
import { StepPrinter } from '#core/output/StepPrinter';
import { bindEnv } from '#tests/bindEnv';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';
import { APP_ID, fakeDiscord, fakeProject, pipedTerminal, slash } from '#tests/commands/commands/fakeBot';
import { fakeDiscordApi } from '#tests/fakeDiscordApi';
import { silentLogger } from '#tests/silentLogger';

import type { ListScope } from '#commands/commands/list/ListRunner';
import type { ProjectOpener } from '#core/config/openProjectWithSteps';

interface ListOptions {
    verbose?: boolean;
    scope?: ListScope;
}

function runnerFor(project: ProjectOpener, rest: REST): ListRunner {
    return new ListRunner({ projectLoader: project, openDiscord: () => rest, logger: silentLogger });
}

async function list(project: ProjectOpener, rest: REST, { verbose = false, scope }: ListOptions = {}): Promise<string> {
    const stdout = pipedTerminal();
    const printer = new StepPrinter({ command: 'commands', labels: LIST_STEPS, verbose, stdout, stderr: stdout });
    await runnerFor(project, rest).run(new ListPresenter(printer, verbose), scope);
    return stdout.text();
}

const ON_DISCORD = {
    [Routes.applicationCommands(APP_ID)]: [slash('ping'), slash('legacy')],
    [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('config')]
};

describe('ListRunner', () => {
    it('lists what discord has globally and in each guild the code deploys to', async () => {
        const { rest } = fakeDiscord(ON_DISCORD);

        const output = await list(await fakeProject(), rest);

        expect(output).toContain('  global  2 commands\n      /ping /legacy\n\n  Alpha  1 command\n      /config\n');
    });

    it('puts each command on its own line with its id under --verbose', async () => {
        const { rest } = fakeDiscord(ON_DISCORD);

        const output = await list(await fakeProject(), rest, { verbose: true });

        expect(output).toContain('  global  2 commands\n      /ping  ping-id\n      /legacy  legacy-id\n');
    });

    it('lists only the global scope for a bot with no commands folder', async () => {
        const { rest } = fakeDiscord(ON_DISCORD);

        const output = await list(await fakeProject({ commandsPath: null }), rest);

        expect(output).toContain('  global  2 commands\n');
        expect(output).not.toContain('Alpha');
    });

    it('adds the guilds passed with --guilds', async () => {
        const { rest } = fakeDiscord({
            ...ON_DISCORD,
            [Routes.guild('222')]: { id: '222', name: 'Beta' },
            [Routes.applicationGuildCommands(APP_ID, '222')]: [slash('setup')]
        });

        const output = await list(await fakeProject(), rest, { scope: { guildIds: ['222'], allGuilds: false } });

        expect(output).toContain('  Alpha  1 command\n      /config\n\n  Beta  1 command\n      /setup\n');
    });

    it('throws CoreDiscordReadFailed on a guild it cannot read', async () => {
        const { rest } = fakeDiscord({
            ...ON_DISCORD,
            [Routes.guild('222')]: { id: '222', name: 'Beta' },
            [Routes.applicationGuildCommands(APP_ID, '222')]: new Error('Missing Access')
        });

        const listing = list(await fakeProject(), rest, { scope: { guildIds: ['222'], allGuilds: false } });

        await expect(listing).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDiscordReadFailed });
    });

    it("reads discord through the bot's own REST options", async () => {
        const discord = await fakeDiscordApi({ [Routes.currentApplication()]: { id: APP_ID }, ...ON_DISCORD });
        using _env = bindEnv({ DISCORD_BOT_TOKEN: FAKE_TOKEN });
        const project = await fakeProject({ commandsPath: null, rest: new REST({ api: discord.api }) });

        await new ListRunner({ ...defaultRunnerDeps(), projectLoader: project }).read(quietSteps);

        expect(discord.routes).toContain(Routes.applicationCommands(APP_ID));
    });

    it('lists every guild the bot is in with --all-guilds and reads no guild names one by one', async () => {
        const { rest, gets } = fakeDiscord({
            ...ON_DISCORD,
            [Routes.userGuilds()]: [
                { id: '111', name: 'Alpha' },
                { id: '333', name: 'Gamma' }
            ],
            [Routes.applicationGuildCommands(APP_ID, '333')]: [slash('rank')]
        });

        const output = await list(await fakeProject(), rest, { scope: { guildIds: [], allGuilds: true } });

        expect(output).toContain('  Gamma  1 command\n      /rank\n');
        expect(gets).not.toContain(Routes.guild('333'));
    });
});

describe('listingJson', () => {
    it('keys each guild by id and passes every command through as discord sent it', async () => {
        const config = {
            ...slash('config'),
            guild_id: '111',
            description: 'Change the settings',
            options: [{ type: ApplicationCommandOptionType.String, name: 'key', description: 'Setting' }],
            version: '9'
        };
        const { rest } = fakeDiscord({ ...ON_DISCORD, [Routes.applicationGuildCommands(APP_ID, '111')]: [config] });

        const listings = await runnerFor(await fakeProject(), rest).read(quietSteps);

        expect(listingJson(listings)).toEqual({
            global: [slash('ping'), slash('legacy')],
            guilds: { '111': [config] }
        });
    });
});
