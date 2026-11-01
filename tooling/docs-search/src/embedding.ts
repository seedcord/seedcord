import type { GuideSection } from '#src/guideSections';

// search was tested at 1600. longer sections are untested
const DOCUMENT_CHARS = 1600;

export const embedding = {
    model: '@cf/google/embeddinggemma-300m',
    dimensions: 768,
    // embeddinggemma's model card asks for these prefixes
    document: ({ page, heading, text }: GuideSection): string =>
        `title: ${heading ? `${page} > ${heading}` : page} | text: ${text}`.slice(0, DOCUMENT_CHARS),
    query: (question: string): string => `task: search result | query: ${question}`
} as const;
