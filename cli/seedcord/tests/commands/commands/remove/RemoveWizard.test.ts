import { stripVTControlCharacters } from 'node:util';

import { paint } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { askClean } from '#commands/commands/clean/CleanMode';
import { askPurge } from '#commands/commands/purge/PurgeMode';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { RemoveWizard, WIZARD_STEPS } from '#commands/commands/remove/RemoveWizard';
import { levelMark } from '#core/output/levelMark';
import { StepPrinter } from '#core/output/StepPrinter';
import { KEY, PromptTerminal } from '#tests/core/prompts/PromptTerminal';

import type { WizardQuestions } from '#commands/commands/remove/RemoveWizard';
import type { REST } from '@discordjs/rest';

const ROUTES: Record<string, unknown> = {
    '/applications/@me': { id: 'app1' },
    '/users/@me/guilds': [
        { id: 'g1', name: 'Alpha' },
        { id: 'g2', name: 'Beta' },
        { id: 'g3', name: 'Gamma' }
    ],
    '/applications/app1/commands': [
        { id: 'c1', name: 'ban', type: ApplicationCommandType.ChatInput },
        { id: 'c2', name: 'kick', type: ApplicationCommandType.ChatInput }
    ],
    '/applications/app1/guilds/g1/commands': [
        { id: '11', name: 'ban', type: ApplicationCommandType.ChatInput },
        { id: '12', name: 'setup', type: ApplicationCommandType.ChatInput },
        { id: '13', name: 'Report', type: ApplicationCommandType.Message }
    ],
    '/applications/app1/guilds/g2/commands': [{ id: '21', name: 'kick', type: ApplicationCommandType.ChatInput }]
};

// a step's time depends on the machine
const masked = (screen: string): string => screen.replaceAll(/ +\d[\d.]*m?s\b/gu, (time) => 'T'.padStart(time.length));
const finished = (row: string): string => `  ${paint.check} ${row}`;

// an Error as a route's value makes that request reject with it
function reply(value: unknown): Promise<unknown> {
    return Error.isError(value) ? Promise.reject(value) : Promise.resolve(value ?? []);
}

interface WizardRun {
    deleted: string[];
    cleared: string[];
    done: Promise<void>;
}

function wizard(
    terminal: PromptTerminal,
    overrides: Record<string, unknown> = {},
    questions: WizardQuestions = askClean
): WizardRun {
    const routes = { ...ROUTES, ...overrides };
    const deleted: string[] = [];
    const cleared: string[] = [];
    const rest: Pick<REST, 'get' | 'delete' | 'put'> = {
        get: vi.fn((route: string) => reply(routes[route])),
        delete: vi.fn(async (route: string) => {
            await reply(routes[route]);
            deleted.push(route);
        }),
        put: vi.fn((route: string) => {
            cleared.push(route);
            return Promise.resolve([]);
        })
    };
    const printer = new StepPrinter({
        command: 'commands',
        labels: WIZARD_STEPS,
        verbose: false,
        stdout: terminal.stdout,
        stderr: terminal.stdout
    });
    const runner = new RemoveRunner(() => rest);
    const done = new RemoveWizard(runner, 'token', printer, terminal.prompter, false).run(questions);
    return { deleted, cleared, done };
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
            '/applications/app1/guilds/g1/commands/11',
            '/applications/app1/guilds/g2/commands/21'
        ]);
        expect(masked(await terminal.screen())).toBe(
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
        const screen = masked(await terminal.screen());
        expect(screen).not.toContain('delete  ');
        expect(screen.trimEnd().split('\n').at(-1)).toBe('  Nothing deleted.');
    });

    it('skips the picker when the bot is in one guild', async () => {
        using terminal = new PromptTerminal();
        const { deleted, done } = wizard(terminal, { '/users/@me/guilds': [{ id: 'g1', name: 'Alpha' }] });

        await terminal.press(KEY.enter, 'y', KEY.enter);
        await done;

        expect(deleted).toEqual(['/applications/app1/guilds/g1/commands/11']);
        expect(masked(await terminal.screen())).toContain('guilds        T  1 guild, using Alpha');
    });

    it.each([
        ['the bot is in no guilds', { '/users/@me/guilds': [] }, [KEY.enter], 'The bot is in no guilds.'],
        ['no guild is picked', {}, [KEY.enter, KEY.enter], 'No guilds selected.']
    ])('stops when %s', async (_name, overrides, keys, line) => {
        using terminal = new PromptTerminal();
        const { deleted, done } = wizard(terminal, overrides);

        await terminal.press(...keys);
        await done;

        expect(deleted).toEqual([]);
        expect(await terminal.screen()).toContain(line);
    });

    it('warns about a guild it could not read and a command it could not delete', async () => {
        using terminal = new PromptTerminal();
        const { done } = wizard(terminal, {
            '/applications/app1/guilds/g2/commands': new Error('Missing Access'),
            '/applications/app1/guilds/g1/commands/11': new Error('Unknown Command')
        });

        await terminal.press(KEY.enter, KEY.tab, KEY.down, KEY.tab, KEY.enter, 'y', KEY.enter);
        await done;

        const screen = await terminal.screen();
        const warning = stripVTControlCharacters(levelMark('warn'));
        expect(screen).toContain(`  ${warning} Could not read 1 guild (Beta).`);
        expect(screen).toContain(`  ${warning} Could not delete ban in Alpha (Unknown Command).`);
    });
});

describe('RemoveWizard with the purge questions', () => {
    it('empties a picked guild and tags each context menu with its kind', async () => {
        using terminal = new PromptTerminal();
        const { cleared, deleted, done } = wizard(terminal, {}, askPurge);

        await terminal.press(KEY.enter, KEY.enter, KEY.tab, KEY.enter, 'y', KEY.enter);
        await done;

        expect(cleared).toEqual(['/applications/app1/guilds/g1/commands']);
        expect(deleted).toEqual([]);
        const screen = masked(await terminal.screen()).replaceAll(' ', ' ');
        expect(screen).toContain('scan          T  3 commands in 1 guild');
        expect(screen).toContain('  Alpha  3 commands\n      /ban /setup Report (message)');
    });

    it('empties only global without asking about guilds', async () => {
        using terminal = new PromptTerminal();
        const { cleared, done } = wizard(terminal, {}, askPurge);

        await terminal.press(KEY.down, KEY.enter, 'y', KEY.enter);
        await done;

        expect(cleared).toEqual(['/applications/app1/commands']);
        const screen = masked(await terminal.screen());
        expect(screen).toContain('scan          T  2 commands in global');
        expect(screen).not.toContain('Global commands untouched.');
    });

    it('empties global and every guild that has commands', async () => {
        using terminal = new PromptTerminal();
        const { cleared, done } = wizard(terminal, {}, askPurge);

        await terminal.press(KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter, 'y', KEY.enter);
        await done;

        expect(cleared).toEqual([
            '/applications/app1/commands',
            '/applications/app1/guilds/g1/commands',
            '/applications/app1/guilds/g2/commands'
        ]);
    });
});
