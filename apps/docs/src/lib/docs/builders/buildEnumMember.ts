import { ensureSlug, collectMemberTags, buildDeprecationStatusFromNodeLike } from './utils';
import { cloneCommentParagraphs } from '../comments/creators';
import { formatCommentRich } from '../comments/formatter';
import { highlightCode } from '../formatting';

import type { EnumMemberModel, FormatContext } from '../types';
import type { DocNode } from '@seedcord/docs-engine';

export async function buildEnumMember(node: DocNode, context: FormatContext): Promise<EnumMemberModel> {
    const code = await highlightCode(node.headerText ?? node.name);
    const comment = await formatCommentRich(node.comment, context);
    const member: EnumMemberModel = {
        id: ensureSlug(node),
        label: node.name,
        summary: cloneCommentParagraphs(comment.paragraphs),
        signature: code,
        deprecationStatus: buildDeprecationStatusFromNodeLike(node)
    };

    const tags = collectMemberTags(node);
    if (tags.length) member.tags = tags;

    if (node.defaultValue) member.value = node.defaultValue;
    if (node.sourceUrl) member.sourceUrl = node.sourceUrl;

    return member;
}
