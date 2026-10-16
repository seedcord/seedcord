// a family emoji is several code points that draw as one character
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export class LineEditor {
    private constructor(
        public readonly text: string,
        public readonly caret: number
    ) {}

    public static empty(): LineEditor {
        return new LineEditor('', 0);
    }

    public get before(): string {
        return this.text.slice(0, this.caret);
    }

    public get after(): string {
        return this.text.slice(this.caret);
    }

    public insert(typed: string): LineEditor {
        return new LineEditor(this.before + typed + this.after, this.caret + typed.length);
    }

    public deleteBack(): LineEditor {
        return this.cut(this.charStartBefore(), this.caret);
    }

    public deleteForward(): LineEditor {
        return this.cut(this.caret, this.charEndAfter());
    }

    public deleteWordBack(): LineEditor {
        return this.cut(this.wordStartBefore(), this.caret);
    }

    public deleteWordForward(): LineEditor {
        return this.cut(this.caret, this.wordEndAfter());
    }

    public deleteToStart(): LineEditor {
        return this.cut(0, this.caret);
    }

    public deleteToEnd(): LineEditor {
        return this.cut(this.caret, this.text.length);
    }

    public left(): LineEditor {
        return this.moveTo(this.charStartBefore());
    }

    public right(): LineEditor {
        return this.moveTo(this.charEndAfter());
    }

    public wordLeft(): LineEditor {
        return this.moveTo(this.wordStartBefore());
    }

    public wordRight(): LineEditor {
        return this.moveTo(this.wordEndAfter());
    }

    public start(): LineEditor {
        return this.moveTo(0);
    }

    public end(): LineEditor {
        return this.moveTo(this.text.length);
    }

    public masked(mark: string): LineEditor {
        const count = (text: string): number => [...GRAPHEMES.segment(text)].length;
        return new LineEditor(mark.repeat(count(this.text)), mark.length * count(this.before));
    }

    public get atCaret(): string {
        const [first] = GRAPHEMES.segment(this.after);
        return first?.segment ?? '';
    }

    private charStartBefore(): number {
        return [...GRAPHEMES.segment(this.before)].at(-1)?.index ?? 0;
    }

    private charEndAfter(): number {
        return this.caret + this.atCaret.length;
    }

    // a word move skips the spaces next to the caret, then the word past them
    private wordStartBefore(): number {
        return this.before.trimEnd().search(/\S*$/u);
    }

    private wordEndAfter(): number {
        return this.caret + (/^\s*\S*/u.exec(this.after)?.[0].length ?? 0);
    }

    private moveTo(caret: number): LineEditor {
        return new LineEditor(this.text, caret);
    }

    private cut(from: number, to: number): LineEditor {
        return new LineEditor(this.text.slice(0, from) + this.text.slice(to), from);
    }
}
