import type { Question } from '#src/question';

export interface CodeMention {
    code: number;
    name: string;
}

export interface CodeMentions {
    swapped: CodeMention[];
    hints: CodeMention[];
}

const BRACKETED_CODE = /\[(\d{4})\]/g;
const ONLY_A_CODE = /^(\d{4})$/g;
const CODE_AFTER_THE_WORD_ERROR = /(?<=\berror(?: code)?\W{0,3})(\d{4})\b/gi;
const CERTAIN_CODES = [BRACKETED_CODE, ONLY_A_CODE, CODE_AFTER_THE_WORD_ERROR];

const FOUR_DIGITS_OUTSIDE_PATHS_AND_DATES = /(?<![\d.:/#-])\d{4}(?![\d:/-]|\.\d)/g;

export class ErrorCodeReader {
    constructor(private readonly codeNames: Readonly<Record<number, string>>) {}

    read(question: Question): CodeMentions & { question: string } {
        const swapped = new Map<number, CodeMention>();
        let withNames: string = question;
        for (const certainCode of CERTAIN_CODES) {
            withNames = withNames.replace(certainCode, (written, digits: string) => {
                const mention = this.mentionOf(digits);
                if (mention === undefined) return written;
                swapped.set(mention.code, mention);
                return mention.name;
            });
        }

        const hints = new Map<number, CodeMention>();
        for (const [digits] of withNames.matchAll(FOUR_DIGITS_OUTSIDE_PATHS_AND_DATES)) {
            const mention = this.mentionOf(digits);
            if (mention !== undefined && !swapped.has(mention.code)) hints.set(mention.code, mention);
        }

        return { question: withNames, swapped: [...swapped.values()], hints: [...hints.values()] };
    }

    private mentionOf(digits: string): CodeMention | undefined {
        const code = Number(digits);
        const name = this.codeNames[code];
        return name === undefined ? undefined : { code, name };
    }
}

export const errorCodeQuestion = (code: number): string => `error ${code}`;
