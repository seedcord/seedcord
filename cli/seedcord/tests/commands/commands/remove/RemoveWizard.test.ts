import { stripVTControlCharacters } from 'node:util';

import { KEY, PromptTerminal } from '@seedcord/cli-prompts/testing';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { askClean } from '#commands/commands/clean/CleanMode';
import { askPurge } from '#commands/commands/purge/PurgeMode';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { RemoveWizard, WIZARD_STEPS } from '#commands/commands/remove/RemoveWizard';
import { levelMark } from '#core/output/levelMark';
import { StepPrinter } from '#core/output/StepPrinter';
import { APP_ID, fakeDiscord, removeDeps, slash } from '#tests/commands/commands/fakeBot';
import { maskStepTimes } from '#tests/maskStepTimes';

import type { WizardQuestions } from '#commands/commands/remove/RemoveWizard';
import type { APIApplicationCommand } from 'discord-api-types/v10';

function command(id: string, name: string, type = ApplicationCommandType.ChatInput): APIApplicationCommand {
    return { ...slash(name), id, type };
}

const ROUTES: Record<string, unknown> = {
    [Routes.userGuilds()]: [
        { id: 'g1', name: 'Alpha' },
        { id: 'g2', name: 'Beta' },
        { id: 'g3', name: 'Gamma' }
    ],
    [Routes.applicationCommands(APP_ID)]: [command('c1', 'ban'), command('c2', 'kick')],
    [Routes.applicationGuildCommands(APP_ID, 'g1')]: [
        command('11', 'ban'),
        command('12', 'setup'),
        command('13', 'Report', ApplicationCommandType.Message)
    ],
    [Routes.applicationGuildCommands(APP_ID, 'g2')]: [command('21', 'kick')],
    [Routes.applicationGuildCommands(APP_ID, 'g3')]: []
};

const finished = (row: string): string => `  ${paint.check} ${row}`;

interface WizardRun {
    deleted: string[];
    cleared: { route: string }[];
    done: Promise<void>;
}

function wizard(
    terminal: PromptTerminal,
    overrides: Record<string, unknown> = {},
    questions: WizardQuestions = askClean
): WizardRun {
    const { rest, deletes, puts } = fakeDiscord({ ...ROUTES, ...overrides });
    const printer = new StepPrinter({
        command: 'commands',
        labels: WIZARD_STEPS,
        verbose: false,
        stdout: terminal.stdout,
        stderr: terminal.stdout
    });
    const runner = new RemoveRunner(removeDeps(rest));
    const done = new RemoveWizard(runner, printer, terminal.prompter, false).run(questions);
    return { deleted: deletes, cleared: puts, done };
}

describe('RemoveWizard with the clean questions', () => {
    it('leaves only the steps, the preview and the outcome once the picked duplicates are gone', async () => {
        using terminal = new PromptTerminal();
        const { deleted, done } = wizard(terminal);

        await terminal.press(KEY.enter);
        await terminal.press(KEY.tab, KEY.down, KEY.tab, KEY.enter);
        await terminal.press('y', KEY.enter);
        await done;

        expect(deleted).toEqual([
            '/applications/app-1/guilds/g1/commands/11',
            '/applications/app-1/guilds/g2/commands/21'
        ]);
        expect(maskStepTimes(await terminal.screen())).toBe(
            [
                finished('guilds        T  3 guilds'),
                finished('connect       T'),
                finished('scan          T  2 duplicates in 2 guilds'),
                '',
                '  Alpha  1 duplicate',
                '      /ban',
                '',
                '  Beta  1 duplicate',
                '      /kick',
                '',
                finished('delete        T  2 deleted'),
                '',
                '  Global commands untouched.'
            ].join('\n')
        );
    });

    it('prints cancelled and deletes nothing when a prompt is cancelled', async () => {
        using terminal = new PromptTerminal();
        const { deleted, done } = wizard(terminal);

        await terminal.press(KEY.escape);
        await done;

        expect(deleted).toEqual([]);
        expect(await terminal.screen()).toBe('  cancelled');
    });

    it('deletes nothing and says so when the delete is declined', async () => {
        using terminal = new PromptTerminal();
        const { deleted, done } = wizard(terminal);

        await terminal.press(KEY.enter, KEY.tab, KEY.enter, KEY.enter);
        await done;

        expect(deleted).toEqual([]);
        const screen = maskStepTimes(await terminal.screen());
        expect(screen).not.toContain('delete  ');
        expect(screen.trimEnd().split('\n').at(-1)).toBe('  Nothing deleted.');
    });

    it('skips the picker when the bot is in one guild', async () => {
        using terminal = new PromptTerminal();
        const { deleted, done } = wizard(terminal, { [Routes.userGuilds()]: [{ id: 'g1', name: 'Alpha' }] });

        await terminal.press(KEY.enter, 'y', KEY.enter);
        await done;

        expect(deleted).toEqual(['/applications/app-1/guilds/g1/commands/11']);
        expect(maskStepTimes(await terminal.screen())).toContain('guilds        T  1 guild, using Alpha');
    });

    it.each([
        ['the bot is in no guilds', { [Routes.userGuilds()]: [] }, [KEY.enter], 'The bot is in no guilds.'],
        ['no guild is picked', {}, [KEY.enter, KEY.enter], 'No guilds selected.']
    ])('stops when %s', async (_name, overrides, keys, line) => {
        using terminal = new PromptTerminal();
        const { deleted, done } = wizard(terminal, overrides);

        await terminal.press(...keys);
        await done;

        expect(deleted).toEqual([]);
        expect(await terminal.screen()).toContain(line);
    });

    it('warns about a command it could not delete, then throws CliCommandsNotDeleted', async () => {
        using terminal = new PromptTerminal();
        const { done } = wizard(terminal, {
            '/applications/app-1/guilds/g1/commands/11': new Error('Unknown Command')
        });

        await terminal.press(KEY.enter, KEY.tab, KEY.down, KEY.tab, KEY.enter, 'y', KEY.enter);
        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliCommandsNotDeleted });

        const screen = await terminal.screen();
        const warning = stripVTControlCharacters(levelMark('warn'));
        expect(screen).toContain(`  ${warning} Could not delete ban in Alpha (Unknown Command).`);
    });
});

describe('RemoveWizard with the purge questions', () => {
    it('empties a picked guild and tags each context menu with its kind', async () => {
        using terminal = new PromptTerminal();
        const { cleared, deleted, done } = wizard(terminal, {}, askPurge);

        await terminal.press(KEY.enter, KEY.enter, KEY.tab, KEY.enter, 'y', KEY.enter);
        await done;

        expect(cleared.map(({ route }) => route)).toEqual(['/applications/app-1/guilds/g1/commands']);
        expect(deleted).toEqual([]);
        const screen = maskStepTimes(await terminal.screen()).replaceAll(' ', ' ');
        expect(screen).toContain('scan          T  3 commands in 1 guild');
        expect(screen).toContain('  Alpha  3 commands\n      /ban /setup Report (message)');
    });

    it('empties only global without asking about guilds', async () => {
        using terminal = new PromptTerminal();
        const { cleared, done } = wizard(terminal, {}, askPurge);

        await terminal.press(KEY.down, KEY.enter, 'y', KEY.enter);
        await done;

        expect(cleared.map(({ route }) => route)).toEqual(['/applications/app-1/commands']);
        const screen = maskStepTimes(await terminal.screen());
        expect(screen).toContain('scan          T  2 commands globally');
        expect(screen).not.toContain('Global commands untouched.');
    });

    it('empties global and every guild that has commands', async () => {
        using terminal = new PromptTerminal();
        const { cleared, done } = wizard(terminal, {}, askPurge);

        await terminal.press(KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter, 'y', KEY.enter);
        await done;

        expect(cleared.map(({ route }) => route)).toEqual([
            '/applications/app-1/commands',
            '/applications/app-1/guilds/g1/commands',
            '/applications/app-1/guilds/g2/commands'
        ]);
    });
});
