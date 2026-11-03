import type { Tagged } from 'type-fest';

export const QUESTION_LENGTH = { min: 2, max: 500 } as const;

export const QUESTION_RULE = `${QUESTION_LENGTH.min} to ${QUESTION_LENGTH.max} characters, with a letter or a number in them`;

export type Question = Tagged<string, 'Question'>;

const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

const isQuestion = (text: string): text is Question =>
    text.length >= QUESTION_LENGTH.min && text.length <= QUESTION_LENGTH.max && LETTER_OR_NUMBER.test(text);

export const collapseSpaces = (text: string): string => text.replaceAll(/\s+/g, ' ');

export function parseQuestion(input: string): Question | undefined {
    const question = collapseSpaces(input.trim());
    return isQuestion(question) ? question : undefined;
}

const STACK_FRAME = /^\s*at .*:\d+:\d+\)?\s*$/gm;

function cutAtWord(text: string, max: number): string {
    if (text.length <= max) return text;
    const lastSpace = text.lastIndexOf(' ', max);
    return text.slice(0, lastSpace > 0 ? lastSpace : max);
}

export function questionFromText(text: string): { question: Question | undefined; shortened: boolean } {
    const withoutFrames = collapseSpaces(text.replaceAll(STACK_FRAME, '').trim());
    const kept = cutAtWord(withoutFrames, QUESTION_LENGTH.max);
    return { question: parseQuestion(kept), shortened: kept.length < withoutFrames.length };
}
