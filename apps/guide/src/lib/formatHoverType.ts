import { format } from 'prettier';

// 76 mono columns is what the popup fits at its 36rem cap
const PRINT_WIDTH = 76;

interface Shape {
    readonly match: RegExp;
    readonly wrap: (text: string) => string;
    readonly unwrap: (printed: string, text: string) => string;
}

const dropEdges = (printed: string, lead: string, tail: string): string =>
    printed.slice(lead.length, printed.length - tail.length);

// typescript prints a member hover as its receiver in front of a type
const RECEIVER = /^.+\.\w+: /;

// prettier only parses a whole statement
const SHAPES: readonly Shape[] = [
    {
        match: /^class /,
        wrap: (text) => `declare ${text} {}`,
        unwrap: (printed) => dropEdges(printed, 'declare ', ' {}')
    },
    {
        match: /^interface /,
        wrap: (text) => `${text} {}`,
        unwrap: (printed) => dropEdges(printed, '', ' {}')
    },
    {
        match: /^(?:function|const|let|var) /,
        wrap: (text) => `declare ${text};`,
        unwrap: (printed) => dropEdges(printed, 'declare ', ';')
    },
    {
        match: /^type /,
        wrap: (text) => `${text};`,
        unwrap: (printed) => dropEdges(printed, '', ';')
    },
    {
        match: RECEIVER,
        wrap: (text) => `type T = ${text.replace(RECEIVER, '')};`,
        unwrap: (printed, text) => (RECEIVER.exec(text)?.[0] ?? '') + dropEdges(printed, 'type T = ', ';')
    }
];

async function prettify(source: string): Promise<string | null> {
    try {
        const printed = await format(source, {
            parser: 'typescript',
            printWidth: PRINT_WIDTH,
            tabWidth: 4,
            semi: true,
            // matches the reference site's signature formatter
            trailingComma: 'none'
        });

        return printed.trimEnd();
    } catch {
        return null;
    }
}

export async function formatHoverType(text: string): Promise<string> {
    const shape = SHAPES.find((candidate) => candidate.match.test(text));
    if (!shape) return text;

    const printed = await prettify(shape.wrap(text));

    return printed === null ? text : shape.unwrap(printed, text);
}
