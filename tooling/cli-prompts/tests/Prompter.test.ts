import { PassThrough } from 'node:stream';

import { describe, expect, it, vi } from 'vite-plus/test';

import { Prompter } from '#src/Prompter';
import { KEY } from '#src/PromptTerminal';
import { ScreenStdout } from '#src/terminalStubs';

// process.stdin stops reading the console one tick after it pauses
class RecordingStdin extends PassThrough {
    public readonly isTTY = true;
    public readonly events: string[] = [];

    public constructor() {
        super();
        this.on('pause', () => process.nextTick(() => this.events.push('read stopped')));
    }

    public setRawMode(mode: boolean): this {
        this.events.push(`raw ${mode}`);
        return this;
    }

    public async press(key: string): Promise<void> {
        this.write(key);
        await vi.waitFor(() => expect(this.readableLength).toBe(0), { interval: 1 });
    }
}

describe('Prompter', () => {
    // a console read still pending in cooked mode holds a windows process open until enter
    it('stops reading stdin before it turns raw mode off', async () => {
        const stdin = new RecordingStdin();
        const stdout = new ScreenStdout({ rows: 24, columns: 100 });
        const prompter = new Prompter({ stdin, stdout });

        for (const message of ['First?', 'Second?']) {
            const answer = prompter.confirm({ message });
            await stdin.press(KEY.enter);
            await expect(answer).resolves.toBe(false);

            expect(stdin.events.slice(-2)).toEqual(['read stopped', 'raw false']);
        }

        stdin.destroy();
        stdout.destroy();
    });
});
