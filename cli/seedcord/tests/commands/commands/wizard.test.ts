import { stripVTControlCharacters } from 'node:util';

import { paint } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { CleanRunner } from '#commands/commands/CleanRunner';
import { runCleanWizard, WIZARD_STEPS } from '#commands/commands/wizard';
import { levelMark } from '#core/output/levelMark';
import { StepPrinter } from '#core/output/StepPrinter';
import { KEY, PromptTerminal } from '#tests/core/prompts/promptTerminal';

import type { REST } from '@discordjs/rest';

const ROUTES: Record<string, unknown> = {
    '/applications/@me': { id: 'app1' },
    '/users/@me/guilds': [
        { id: 'g1', name: 'Alpha' },
        { id: 'g2', name: 'Beta' },
        { id: 'g3', name: 'Gamma' }
    ],
    '/applications/app1/commands': [
        { id: 'c1', name: 'ban' },
        { id: 'c2', name: 'kick' }
    ],
    '/applications/app1/guilds/g1/commands': [
        { id: '11', name: 'ban' },
        { id: '12', name: 'setup' }
    ],
    '/applications/app1/guilds/g2/commands': [{ id: '21', name: 'kick' }]
};

// a step's time depends on the machine
const masked = (screen: string): string => screen.replaceAll(/\d[\d.]*m?s\b/gu, 'T');
const finished = (row: string): string => `  ${paint.check} ${row}`;

// an Error as a route's value makes that request reject with it
function reply(value: unknown): Promise<unknown> {
    return Error.isError(value) ? Promise.reject(value) : Promise.resolve(value ?? []);
}

function wizard(overrides: Record<string, unknown> = {}): {
    terminal: PromptTerminal;
    deleted: string[];
    done: Promise<void>;
} {
    const routes = { ...ROUTES, ...overrides };
    const terminal = new PromptTerminal();
    const deleted: string[] = [];
    const rest: Pick<REST, 'get' | 'delete'> = {
        get: vi.fn((route: string) => reply(routes[route])),
        delete: vi.fn(async (route: string) => {
            await reply(routes[route]);
            deleted.push(route);
        })
    };
    const printer = new StepPrinter({
        command: 'commands',
        labels: WIZARD_STEPS,
        verbose: false,
        stdout: terminal.stdout,
        stderr: terminal.stdout
    });
    const done = runCleanWizard(new CleanRunner(() => rest), 'token', printer, terminal.prompter);
    return { terminal, deleted, done };
}

describe('runCleanWizard', () => {
    it('leaves only the steps, the preview and the outcome once the picked duplicates are gone', async () => {
        const { terminal, deleted, done } = wizard();

        await terminal.press(KEY.enter);
        await terminal.press(KEY.tab, KEY.down, KEY.tab, KEY.enter);
        await terminal.press(KEY.enter);
        await terminal.press('y', KEY.enter);
        await done;

        expect(deleted).toEqual([
            '/applications/app1/guilds/g1/commands/11',
            '/applications/app1/guilds/g2/commands/21'
        ]);
        expect(masked(await terminal.screen())).toBe(
            [
                finished('guilds      T  3 guilds'),
                finished('connect     T'),
                finished('scan        T  2 duplicates in 2 guilds'),
                '',
                '    Alpha  /ban',
                '    Beta   /kick',
                '',
                finished('delete      T  2 deleted'),
                '',
                '  Global commands untouched.'
            ].join('\n')
        );
    });

    it('prints cancelled and deletes nothing when a prompt is cancelled', async () => {
        const { terminal, deleted, done } = wizard();

        await terminal.press(KEY.escape);
        await done;

        expect(deleted).toEqual([]);
        expect(await terminal.screen()).toBe('  cancelled');
    });

    it('deletes nothing when the delete is declined', async () => {
        const { terminal, deleted, done } = wizard();

        await terminal.press(KEY.enter, KEY.tab, KEY.enter, KEY.enter, KEY.enter);
        await done;

        expect(deleted).toEqual([]);
        expect(masked(await terminal.screen())).not.toContain('delete');
    });

    it('counts every command for a full reset', async () => {
        const { terminal, done } = wizard();

        await terminal.press(KEY.enter, KEY.tab, KEY.enter, KEY.down, KEY.enter, 'y', KEY.enter);
        await done;

        expect(masked(await terminal.screen())).toContain('scan        T  2 commands in 1 guild');
    });

    it('skips the picker when the bot is in one guild', async () => {
        const { terminal, deleted, done } = wizard({ '/users/@me/guilds': [{ id: 'g1', name: 'Alpha' }] });

        await terminal.press(KEY.enter, KEY.enter, 'y', KEY.enter);
        await done;

        expect(deleted).toEqual(['/applications/app1/guilds/g1/commands/11']);
        expect(masked(await terminal.screen())).toContain('guilds      T  1 guild, using Alpha');
    });

    it.each([
        ['the bot is in no guilds', { '/users/@me/guilds': [] }, [KEY.enter], 'The bot is in no guilds.'],
        ['no guild is picked', {}, [KEY.enter, KEY.enter], 'No guilds selected.']
    ])('stops when %s', async (_name, overrides, keys, line) => {
        const { terminal, deleted, done } = wizard(overrides);

        await terminal.press(...keys);
        await done;

        expect(deleted).toEqual([]);
        expect(await terminal.screen()).toContain(line);
    });

    it('warns about a guild it could not read and a command it could not delete', async () => {
        const { terminal, done } = wizard({
            '/applications/app1/guilds/g2/commands': new Error('Missing Access'),
            '/applications/app1/guilds/g1/commands/11': new Error('Unknown Command')
        });

        await terminal.press(KEY.enter, KEY.tab, KEY.down, KEY.tab, KEY.enter, KEY.enter, 'y', KEY.enter);
        await done;

        const screen = await terminal.screen();
        const warning = stripVTControlCharacters(levelMark('warn'));
        expect(screen).toContain(`  ${warning} Could not read 1 guild (Beta).`);
        expect(screen).toContain(`  ${warning} Could not delete ban in Alpha (Unknown Command).`);
    });
});
