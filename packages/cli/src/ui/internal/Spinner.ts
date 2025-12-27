export class Spinner {
    private staticFrames(): readonly string[] {
        return ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
    }

    private readonly frames: readonly string[] = this.staticFrames();
    private index = 0;
    private currentFrame: string;

    public constructor(public text: string) {
        this.currentFrame = this.frames[0] ?? '';
    }

    public current(): string {
        return this.currentFrame;
    }

    public advance(): void {
        this.index = (this.index + 1) % this.frames.length;
        this.currentFrame = this.frames[this.index] ?? '';
    }
}
