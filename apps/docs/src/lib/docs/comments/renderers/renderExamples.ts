import { highlightCode } from '../../formatting';
import { DEFAULT_INLINE_LANG, FENCE_PREFIX_LENGTH, FENCE_SUFFIX } from '../constants';

import type { CommentExample } from '../../types';
import type { DocComment, DocCommentExample } from '@seedcord/docs-engine';

export async function renderExamples(comment: DocComment): Promise<CommentExample[]> {
    const sourceExamples: DocCommentExample[] | undefined =
        Array.isArray(comment.examples) && comment.examples.length
            ? comment.examples
            : collectExamplesFromBlockTags(comment);

    if (!Array.isArray(sourceExamples) || sourceExamples.length === 0) return [];

    const examples: CommentExample[] = [];
    for (const example of sourceExamples) {
        const { code, language } = extractExample(example);
        if (!code) continue;

        const representation = await highlightCode(code, language);
        const entry: CommentExample = { code: representation };
        if (example.caption) entry.caption = example.caption;
        examples.push(entry);
    }

    return examples;
}

function extractExample(example: DocCommentExample): { code: string; language: string } {
    const raw = example.content.trim();
    if (!raw.startsWith('```')) {
        return {
            code: raw,
            language: (example.language ?? DEFAULT_INLINE_LANG).toLowerCase()
        };
    }

    const fenceEnd = raw.lastIndexOf(FENCE_SUFFIX);
    if (fenceEnd === -1) {
        return {
            code: raw,
            language: (example.language ?? DEFAULT_INLINE_LANG).toLowerCase()
        };
    }

    const firstNewline = raw.indexOf('\n');
    if (firstNewline === -1) {
        return {
            code: raw,
            language: (example.language ?? DEFAULT_INLINE_LANG).toLowerCase()
        };
    }

    const prefixLanguage = raw.slice(FENCE_PREFIX_LENGTH, firstNewline).trim();
    const fallbackLanguage = example.language ?? DEFAULT_INLINE_LANG;
    const languageValue = prefixLanguage.length > 0 ? prefixLanguage : fallbackLanguage;
    const body = raw.slice(firstNewline + 1, fenceEnd).trim();

    return {
        code: body,
        language: languageValue.toLowerCase()
    };
}
export function collectExamplesFromBlockTags(comment: DocComment): DocCommentExample[] | undefined {
    if (comment.blockTags.length === 0) return undefined;

    const collected: DocCommentExample[] = [];
    for (const tag of comment.blockTags) {
        if (tag.tag !== '@example') continue;

        const text = tag.text.length ? tag.text : undefined;

        let contentText: string | undefined;
        if (tag.content.length) {
            const first = tag.content[0];
            if (first?.text.length) contentText = first.text;
        }

        const value = text ?? contentText;
        if (value?.length) {
            collected.push({ content: value });
        }
    }

    return collected.length ? collected : undefined;
}
