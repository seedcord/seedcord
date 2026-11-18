import { describe, expect, it } from 'vite-plus/test';

import { Prompter } from '#src/Prompter';
import { KEY } from '#src/PromptTerminal';
import { KeyboardStdin, ScreenStdout } from '#src/terminalStubs';

// process.stdin stops reading the console one tick after it pauses
class RecordingStdin extends KeyboardStdin {
    public readonly events: string[] = [];

    public constructor() {
        super();
        this.on('pause', () => process.nextTick(() => this.events.push('read stopped')));
    }

    public override setRawMode(mode: boolean): this {
        this.events.push(`raw ${mode}`);
        return this;
    }
}

describe('Prompter', () => {
    it('stops reading stdin before it turns raw mode off', async () => {
        await using stdin = new RecordingStdin();
        await using stdout = new ScreenStdout({ rows: 24, columns: 100 });
        const prompter = new Prompter({ stdin, stdout });

        for (const message of ['First?', 'Second?']) {
            const answer = prompter.confirm({ message });
            await stdin.press(KEY.enter);
            await expect(answer).resolves.toBe(false);

            expect(stdin.events.slice(-2)).toEqual(['read stopped', 'raw false']);
        }
    });
});
