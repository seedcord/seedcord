import { SeedcordErrorCode } from '@seedcord/errors';
import { expect, vi } from 'vite-plus/test';

import { Prompter } from './Prompter';
import { KeyboardStdin, ScreenStdout } from './terminalStubs';

// the bytes terminals send for each key
export const KEY = {
    up: '\u001B[A',
    down: '\u001B[B',
    right: '\u001B[C',
    left: '\u001B[D',
    home: '\u001B[H',
    end: '\u001B[F',
    enter: '\r',
    tab: '\t',
    backspace: '\u007F',
    forwardDelete: '\u001B[3~',
    escape: '\u001B',
    altBackspace: '\u001B\u007F',
    altB: '\u001Bb',
    altF: '\u001Bf',
    altD: '\u001Bd',
    ctrlA: '\u0001',
    ctrlC: '\u0003',
    ctrlE: '\u0005',
    ctrlK: '\u000B',
    ctrlU: '\u0015',
    ctrlW: '\u0017',
    ctrlLeft: '\u001B[1;5D',
    ctrlRight: '\u001B[1;5C',
    ctrlDelete: '\u001B[3;5~'
} as const;

export class PromptTerminal {
    private readonly stdin = new KeyboardStdin();
    // StepPrinter writes here too, the way both share process.stdout for real
    public readonly stdout = new ScreenStdout({ rows: 24, columns: 100 });

    public readonly prompter = new Prompter({ stdin: this.stdin, stdout: this.stdout });

    // ink reads two keys left in the stream together as one pasted string
    public async press(...keys: string[]): Promise<void> {
        for (const key of keys) {
            this.stdin.write(key);
            await vi.waitFor(() => expect(this.stdin.readableLength).toBe(0), { interval: 1 });
        }
    }

    // the prompt rejects before press resolves
    public async cancel(answer: Promise<unknown>, key: string = KEY.escape): Promise<void> {
        const cancelled = expect(answer).rejects.toMatchObject({ code: SeedcordErrorCode.CliCancelled });
        await this.press(key);
        await cancelled;
    }

    // stands in for the next line StepPrinter writes
    public print(text: string): void {
        this.stdout.write(text);
    }

    public screen(): Promise<string> {
        return this.stdout.screen();
    }

    public [Symbol.dispose](): void {
        this.stdin.destroy();
        this.stdout.destroy();
    }
}
