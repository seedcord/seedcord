import type { CommentParagraph } from '../../types';
import type { DocComment } from '@seedcord/docs-engine';

export function renderThrows(comment: DocComment): CommentParagraph[] | undefined {
    if (!comment.blockTags.length) return undefined;

    const collected: string[] = [];
    for (const tag of comment.blockTags) {
        if (tag.tag !== '@throws' && tag.tag !== '@exception') continue;
        const text = tag.text.trim();
        if (text.length) {
            collected.push(text);
            continue;
        }

        const first = tag.content[0];
        const firstText = first?.text.trim();
        if (firstText?.length) collected.push(firstText);
    }

    if (!collected.length) return undefined;

    return collected.map((c) => ({ plain: c.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(), html: c }));
}
