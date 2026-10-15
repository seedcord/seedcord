import { Routes } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ListPresenter } from '#commands/commands/list/ListPresenter';
import { LIST_STEPS, ListRunner } from '#commands/commands/list/ListRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { APP_ID, fakeDiscord, fakeProject, pipedTerminal, slash } from '#tests/commands/commands/fakeBot';
import { silentLogger } from '#tests/silentLogger';

import type { ProjectOpener } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';

async function list(project: ProjectOpener, rest: REST, { verbose = false } = {}): Promise<string> {
    const stdout = pipedTerminal();
    const printer = new StepPrinter({ command: 'commands', labels: LIST_STEPS, verbose, stdout, stderr: stdout });
    await new ListRunner({ projectLoader: project, openDiscord: () => rest, logger: silentLogger }).run(
        new ListPresenter(printer, verbose)
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
});
