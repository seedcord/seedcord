import { Routes } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ListPresenter } from '#commands/commands/list/ListPresenter';
import { LIST_STEPS, ListRunner } from '#commands/commands/list/ListRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { APP_ID, fakeDiscord, fakeProject, pipedTerminal, slash } from '#tests/commands/commands/fakeBot';
import { silentLogger } from '#tests/silentLogger';

import type { ListScope } from '#commands/commands/list/ListRunner';
import type { ProjectOpener } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

interface ListOptions {
    verbose?: boolean;
    scope?: ListScope;
}

async function list(project: ProjectOpener, rest: REST, { verbose = false, scope }: ListOptions = {}): Promise<string> {
    const stdout = pipedTerminal();
    const printer = new StepPrinter({ command: 'commands', labels: LIST_STEPS, verbose, stdout, stderr: stdout });
    await new ListRunner({ projectLoader: project, openDiscord: () => rest, logger: silentLogger }).run(
        new ListPresenter(printer, verbose),
        scope
    );
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

    it('adds the guilds passed with --guild', async () => {
        const { rest } = fakeDiscord({
            ...ON_DISCORD,
            [Routes.guild('222')]: { id: '222', name: 'Beta' },
            [Routes.applicationGuildCommands(APP_ID, '222')]: [slash('setup')]
        });

        const output = await list(await fakeProject(), rest, { scope: { guildIds: ['222'], allGuilds: false } });

        expect(output).toContain('  Alpha  1 command\n      /config\n\n  Beta  1 command\n      /setup\n');
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
