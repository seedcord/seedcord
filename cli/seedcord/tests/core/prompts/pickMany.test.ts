import { describe, expect, it } from 'vitest';

import { settled } from '#tests/ui/settled';

import { KEY, PromptTerminal } from './promptTerminal';

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
        ['a space', 'n h', '102']
    ])('filters by %s', async (_name, typed, expected) => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(...typed, KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual([expected]);
    });

    it('takes the last filter character back on backspace', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(...'kartx', KEY.backspace, KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual(['103']);
    });

    it('keeps picks across filters and returns them in list order', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(...'kart', KEY.tab);
        await terminal.press(...'kart'.split('').map(() => KEY.backspace));
        await terminal.press(KEY.down, KEY.tab, KEY.enter);

        await expect(answer).resolves.toEqual(['102', '103']);
    });

    it('counts the picks and the matches', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.pickMany(GUILDS);

        await terminal.press(...'ma', KEY.tab);

        await settled(async () => expect(await terminal.screen()).toContain('1 selected · 3 of 4 match'));
        await terminal.press(KEY.escape);
        await expect(answer).rejects.toThrow();
    });

    it('shows ten rows and keeps the highlighted one among them', async () => {
        const terminal = new PromptTerminal();
        const choices = Array.from({ length: 20 }, (_, index) => ({ value: `${index}`, label: `Guild ${index}` }));
        const answer = terminal.prompter.pickMany({ message: 'Guilds to clean', choices });

        await terminal.press(...Array.from({ length: 14 }, () => KEY.down));

        await settled(async () => {
            const screen = await terminal.screen();
            expect(screen).toContain('❯ □ Guild 14');
            expect(screen.match(/Guild \d+/g)).toHaveLength(10);
        });
        await terminal.press(KEY.escape);
        await expect(answer).rejects.toThrow();
    });
});
