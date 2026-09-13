const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const TITLE = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
});

export class ReleaseName {
    private readonly day: Temporal.PlainDate;
    private readonly letter: string;

    constructor(at: Temporal.Instant, tags: readonly string[]) {
        this.day = at.toZonedDateTimeISO('UTC').toPlainDate();
        this.letter = freeLetter(new Set(tags), `release-${this.day.toString().replaceAll('-', '.')}`);
    }

    get tag(): string {
        return `release-${this.day.toString().replaceAll('-', '.')}${this.letter}`;
    }

    get title(): string {
        const date = TITLE.format(new Date(this.day.toString()));
        if (this.letter === '') return date;

        return `${date} (${String(LETTERS.indexOf(this.letter) + 2)})`;
    }
}

function freeLetter(taken: ReadonlySet<string>, base: string): string {
    if (!taken.has(base)) return '';

    const free = [...LETTERS].find((letter) => !taken.has(`${base}${letter}`));
    if (free === undefined) throw new Error(`every release tag for ${base} is taken`);

    return free;
}
