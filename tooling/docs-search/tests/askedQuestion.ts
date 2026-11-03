import { parseQuestion } from '#src/question';

import type { Question } from '#src/question';

export function askedQuestion(input: string): Question {
    const parsed = parseQuestion(input);
    if (parsed === undefined) throw new Error(`${input} isn't a question`);
    return parsed;
}
