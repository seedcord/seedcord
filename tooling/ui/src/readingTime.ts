// both rates are guesses
const PROSE_WORDS_PER_MINUTE = 200;
const CODE_WORDS_PER_MINUTE = 400;

const FENCE = /```[\s\S]*?```/g;
const wordsIn = (text: string): number => text.match(/\S+/g)?.length ?? 0;

export function readingMinutes(markdown: string): number {
    const code = markdown.match(FENCE)?.join(' ') ?? '';
    const prose = markdown.replaceAll(FENCE, ' ');
    const minutes = wordsIn(prose) / PROSE_WORDS_PER_MINUTE + wordsIn(code) / CODE_WORDS_PER_MINUTE;
    return Math.max(1, Math.round(minutes));
}

export const readTimeLabel = (minutes: number): string => `${minutes} min read`;
