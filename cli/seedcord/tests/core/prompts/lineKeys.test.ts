import { describe, expect, it } from 'vitest';

import { settled } from '#tests/ui/settled';

import { KEY, PromptTerminal } from './PromptTerminal';

const QUESTION = '  ? Guilds to clean';
const GUILDS = {
    message: 'Guilds to clean',
    choices: [{ value: '102', label: 'Main Hub' }]
};

async function filterAfter(...keys: string[]): Promise<string> {
    using terminal = new PromptTerminal();
    const answer = terminal.prompter.pickMany(GUILDS);
    await terminal.press(...'main hub', ...keys);

    let line = '';
    await settled(async () => {
        const screen = await terminal.screen();
        const [first = ''] = screen.split('\n');
        expect(first.startsWith(QUESTION)).toBe(true);
        line = first.slice(QUESTION.length).trim();
    });

    await terminal.cancel(answer);
    return line;
}

describe('the pickMany filter', () => {
    it.each([
        ['backspace deletes a character', [KEY.backspace], 'main hu'],
        ['opt or alt+backspace deletes a word', [KEY.altBackspace], 'main'],
        ['ctrl+w deletes a word', [KEY.ctrlW], 'main'],
        ['cmd+backspace, sent as ctrl+u, clears to the start', [KEY.ctrlU], 'type to search'],
        ['ctrl+k clears to the end', [KEY.ctrlA, KEY.ctrlK], 'type to search'],
        ['forward delete deletes after the caret', [KEY.ctrlA, KEY.forwardDelete], 'ain hub'],
        ['ctrl+delete deletes the next word', [KEY.ctrlA, KEY.ctrlDelete], 'hub'],
        ['alt+d deletes the next word', [KEY.ctrlA, KEY.altD], 'hub'],
        ['← moves back a character', [KEY.left, 'x'], 'main huxb'],
        ['→ moves forward a character', [KEY.ctrlA, KEY.right, 'x'], 'mxain hub'],
        ['opt+←, sent as alt+b, moves back a word', [KEY.altB, 'x'], 'main xhub'],
        ['ctrl+← moves back a word', [KEY.ctrlLeft, 'x'], 'main xhub'],
        ['opt+→, sent as alt+f, moves forward a word', [KEY.ctrlA, KEY.altF, 'x'], 'mainx hub'],
        ['ctrl+→ moves forward a word', [KEY.ctrlA, KEY.ctrlRight, 'x'], 'mainx hub'],
        ['home jumps to the start', [KEY.home, 'x'], 'xmain hub'],
        ['cmd+←, sent as ctrl+a, jumps to the start', [KEY.ctrlA, 'x'], 'xmain hub'],
        ['end jumps to the end', [KEY.ctrlA, KEY.end, 'x'], 'main hubx'],
        ['cmd+→, sent as ctrl+e, jumps to the end', [KEY.ctrlA, KEY.ctrlE, 'x'], 'main hubx']
    ])('%s', async (_name, keys, expected) => {
        expect(await filterAfter(...keys)).toBe(expected);
    });
});
