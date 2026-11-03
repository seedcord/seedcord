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
