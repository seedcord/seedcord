export const QUESTION_LENGTH = { min: 2, max: 200 } as const;

export const collapseSpaces = (text: string): string => text.replaceAll(/\s+/g, ' ');

export function parseQuestion(input: string): string | undefined {
    const question = collapseSpaces(input.trim());
    return question.length >= QUESTION_LENGTH.min && question.length <= QUESTION_LENGTH.max ? question : undefined;
}
