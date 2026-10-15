import { describe, expect, it } from 'vitest';

import { PROMPT_MARKS } from '#core/prompts/rows';
import { settled } from '#tests/ui/settled';

import { KEY, PromptTerminal } from './PromptTerminal';

const GUILDS = {
    message: 'Guilds to clean',
    choices: [
        { value: '101', label: "Materwelon's Lab" },
        { value: '102', label: 'Main Hub' },
        { value: '103', label: 'Mario Kart Club' },
        { value: '104', label: 'Test Server' }
    ]
};

describe('Prompter.pickMany', () => {
    it('picks the highlighted row on tab', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(KEY.down, KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual(['102']);
    });

    it.each([
        ['part of a label, any case', 'KART', '103'],
        ['an id', '104', '104'],
        ['a space', 'n h', '102'],
        ['skipped letters', 'mhub', '102'],
        ['a typo', 'mian', '102'],
        ['the best match first', 'ma', '102']
    ])('filters by %s', async (_name, typed, expected) => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(...typed, KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual([expected]);
    });

    it.each([
        ['Cyrillic', 'сервер', 'ru'],
        ['Japanese', '日本', 'jp']
    ])('finds a %s guild name by part of it', async (_name, typed, expected) => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany({
            message: 'Guilds to clean',
            choices: [
                { value: 'ru', label: 'Сервер Друзей' },
                { value: 'jp', label: '日本サーバー' },
                { value: 'en', label: 'Main Hub' }
            ]
        });

        await terminal.press(...typed, KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual([expected]);
    });

    it('lists typo matches after the skipped-letter ones', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany({
            message: 'Guilds to clean',
            choices: [
                { value: 'typo', label: 'Main Hub' },
                { value: 'skipped', label: 'Mexican' }
            ]
        });

        await terminal.press(...'mian', KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual(['skipped']);
    });

    it('keeps picks across filters and returns them in list order', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(...'kart', KEY.tab, KEY.ctrlU, KEY.down, KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual(['102', '103']);
    });

    it('counts the picks and the matches', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(...'ma', KEY.tab);

        await settled(async () => expect(await terminal.screen()).toContain('1 selected · 3 of 4 match'));
        await terminal.cancel(answer);
    });

    it('shows ten rows and keeps the highlighted one among them', async () => {
        const terminal = new PromptTerminal();
        const choices = Array.from({ length: 20 }, (_, index) => ({ value: `${index}`, label: `Guild ${index}` }));
        const answer = terminal.prompter.pickMany({ message: 'Guilds to clean', choices });

        await terminal.press(...Array.from({ length: 14 }, () => KEY.down));

        await settled(async () => {
            const screen = await terminal.screen();
            expect(screen).toContain(`${PROMPT_MARKS.cursor} ${PROMPT_MARKS.unpicked} Guild 14`);
            expect(screen.match(/Guild \d+/g)).toHaveLength(10);
        });
        await terminal.cancel(answer);
    });
});
