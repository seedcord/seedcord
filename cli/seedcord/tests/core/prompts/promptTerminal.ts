import { expect, vi } from 'vitest';

import { Prompter } from '#core/prompts/Prompter';
import { KeyboardStdin, ScreenStdout } from '#tests/ui/terminalStubs';

export const KEY = {
    up: '\u001B[A',
    down: '\u001B[B',
    right: '\u001B[C',
    left: '\u001B[D',
    enter: '\r',
    tab: '\t',
    backspace: '\u007F',
    escape: '\u001B',
    ctrlC: '\u0003'
} as const;

export class PromptTerminal {
    private readonly stdin = new KeyboardStdin();
    private readonly stdout = new ScreenStdout({ rows: 24, columns: 100 });

    public readonly prompter = new Prompter({ stdin: this.stdin, stdout: this.stdout });

    // ink reads two keys left in the stream together as one pasted string
    public async press(...keys: string[]): Promise<void> {
        for (const key of keys) {
            this.stdin.write(key);
            await vi.waitFor(() => expect(this.stdin.readableLength).toBe(0));
        }
    }

    // stands in for the next line StepPrinter writes
    public print(text: string): void {
        this.stdout.write(text);
    }

    public screen(): Promise<string> {
        return this.stdout.screen();
    }
}
