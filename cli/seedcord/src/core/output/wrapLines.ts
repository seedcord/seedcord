import wrapAnsi from 'wrap-ansi';

export interface LinePrefix {
    first: string;
    rest: string;
}

// piped output has no width
export function wrapLines(text: string, width: number | undefined, prefix: LinePrefix): string {
    const lines = text.split('\n').flatMap((line) => {
        if (width === undefined) return [line];
        return wrapAnsi(line, width - prefix.rest.length, { hard: true }).split('\n');
    });

    return lines.map((line, index) => `${index === 0 ? prefix.first : prefix.rest}${line}\n`).join('');
}
