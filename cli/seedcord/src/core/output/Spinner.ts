// ink-spinner's "dots" frames, the ones the dev TUI shows
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const FRAME_MS = 80;

const HIDE_CURSOR = '\u001B[?25l';
const SHOW_CURSOR = '\u001B[?25h';
const CLEAR_LINE = '\r\u001B[2K';

export class Spinner {
    private frame = 0;
    private timer: NodeJS.Timeout | undefined;

    private constructor(
        private readonly write: (text: string) => void,
        private readonly render: (frame: string) => string
    ) {}

    public static start(write: (text: string) => void, render: (frame: string) => string): Spinner {
        const spinner = new Spinner(write, render);
        write(HIDE_CURSOR);
        spinner.draw();
        spinner.timer = setInterval(() => spinner.draw(), FRAME_MS);
        process.once('SIGINT', spinner.restoreOnInterrupt);
        return spinner;
    }

    public stop(): void {
        clearInterval(this.timer);
        process.off('SIGINT', this.restoreOnInterrupt);
        this.write(`${CLEAR_LINE}${SHOW_CURSOR}`);
    }

    private draw(): void {
        const frame = FRAMES[this.frame++ % FRAMES.length] ?? '';
        this.write(`${CLEAR_LINE}${this.render(frame)}`);
    }

    // node skips its default Ctrl-C exit while a SIGINT listener exists
    private readonly restoreOnInterrupt = (): void => {
        this.stop();
        process.kill(process.pid, 'SIGINT');
    };
}
