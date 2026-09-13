const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const FIRST_LETTERED_PUBLISH = 2;
const TAG = /^release-(\d{4})\.(\d{2})\.(\d{2})([a-z]?)$/;

const TITLE = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
});

export class ReleaseName {
    static next(at: Temporal.Instant, tags: readonly string[]): ReleaseName {
        const day = at.toZonedDateTimeISO('UTC').toPlainDate();

        return new ReleaseName(day, freeLetter(new Set(tags), baseTag(day)));
    }

    static fromTag(tag: string): ReleaseName {
        const found = TAG.exec(tag);
        if (!found) throw new Error(`${tag} is not a release tag, expected release-YYYY.MM.DD`);

        const [, year, month, day, letter] = found;
        const date = Temporal.PlainDate.from({ year: Number(year), month: Number(month), day: Number(day) });

        return new ReleaseName(date, letter ?? '');
    }

    private constructor(
        private readonly day: Temporal.PlainDate,
        private readonly letter: string
    ) {}

    get tag(): string {
        return `${baseTag(this.day)}${this.letter}`;
    }

    get title(): string {
        const date = TITLE.format(new Date(this.day.toString()));
        if (this.letter === '') return date;

        return `${date} (${String(LETTERS.indexOf(this.letter) + FIRST_LETTERED_PUBLISH)})`;
    }
}

function baseTag(day: Temporal.PlainDate): string {
    return `release-${day.toString().replaceAll('-', '.')}`;
}

function freeLetter(taken: ReadonlySet<string>, base: string): string {
    if (!taken.has(base)) return '';

    const free = [...LETTERS].find((letter) => !taken.has(`${base}${letter}`));
    if (free === undefined) throw new Error(`every release tag for ${base} is taken`);

    return free;
}
