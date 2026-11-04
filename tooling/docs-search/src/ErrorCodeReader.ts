import type { Question } from '#src/question';

export interface CodeMention {
    code: number;
    name: string;
}

export interface CodeMentions {
    swapped: CodeMention[];
    hints: CodeMention[];
}

const nameOnly = (_digits: string, name: string): string => name;
const digitsAndName = (digits: string, name: string): string => `${digits} ${name}`;

const CERTAIN_CODES = [
    { pattern: /\[(\d{4})\]/g, rewrite: nameOnly },
    { pattern: /(?<=\berror(?: code)?\W{0,3})(\d{4})\b/gi, rewrite: digitsAndName }
];

const FOUR_DIGITS_ON_THEIR_OWN = /(?<![\w.:/#-])\d{4}(?![\w:/-]|\.\d)/g;

const WORD = /[\p{L}']+/gu;

const WORDS_ABOUT_A_CODE = new Set(
    "what what's whats is does do mean means i got get getting a an the error code this about explain".split(' ')
);

export class ErrorCodeReader {
    constructor(private readonly codeNames: Readonly<Record<number, string>>) {}

    read(question: Question): CodeMentions & { question: string } {
        const asked = this.onlyCodeIn(question);
        if (asked !== undefined) return { question: asked.name, swapped: [asked], hints: [] };

        const swapped = new Map<number, CodeMention>();
        let withNames: string = question;
        for (const { pattern, rewrite } of CERTAIN_CODES) {
            withNames = withNames.replace(pattern, (written, digits: string) => {
                const mention = this.mentionOf(digits);
                if (mention === undefined) return written;
                swapped.set(mention.code, mention);
                return rewrite(digits, mention.name);
            });
        }

        const hints = new Map<number, CodeMention>();
        for (const [digits] of withNames.matchAll(FOUR_DIGITS_ON_THEIR_OWN)) {
            const mention = this.mentionOf(digits);
            if (mention !== undefined && !swapped.has(mention.code)) hints.set(mention.code, mention);
        }

        return { question: withNames, swapped: [...swapped.values()], hints: [...hints.values()] };
    }

    private onlyCodeIn(question: string): CodeMention | undefined {
        const [digits, ...others] = question.match(FOUR_DIGITS_ON_THEIR_OWN) ?? [];
        if (digits === undefined || others.length > 0) return undefined;

        const words = question.toLowerCase().match(WORD) ?? [];
        return words.every((word) => WORDS_ABOUT_A_CODE.has(word)) ? this.mentionOf(digits) : undefined;
    }

    private mentionOf(digits: string): CodeMention | undefined {
        const code = Number(digits);
        const name = this.codeNames[code];
        return name === undefined ? undefined : { code, name };
    }
}

export const errorCodeQuestion = (code: number): string => `error ${code}`;
