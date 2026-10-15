import { Prompter } from '#core/prompts/Prompter';
import { KeyboardStdin, ScreenStdout } from '#tests/ui/terminalStubs';

export const KEY = {
    up: '\u001B[A',
    down: '\u001B[B',
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

    public press(...keys: string[]): void {
        for (const key of keys) this.stdin.write(key);
    }

    // stands in for the next line StepPrinter writes
    public print(text: string): void {
        this.stdout.write(text);
    }

    public screen(): Promise<string> {
        return this.stdout.screen();
    }
}
