export class Spinner {
    private staticFrames(): readonly string[] {
        return ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
    }

    private readonly frames: readonly string[] = this.staticFrames();
    private index = 0;

    public constructor(public text: string) {}

    public frame(): string {
        const f = this.frames[this.index] ?? this.frames[0] ?? '';
        this.index = (this.index + 1) % this.frames.length;
        return f;
    }
}
