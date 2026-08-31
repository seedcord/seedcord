import { memberFragment } from '@seedcord/docs-engine';

import { cloneCommentParagraphs } from '#lib/docs/comments/creators';
import { formatCommentRich } from '#lib/docs/comments/formatter';
import { highlightCode } from '#lib/docs/formatting';

import { collectMemberTags, buildDeprecationStatusFromNodeLike } from './utils';

import type { EnumMemberModel, FormatContext } from '#lib/docs/types';
import type { DocNode } from '@seedcord/docs-engine';

export async function buildEnumMember(node: DocNode, context: FormatContext): Promise<EnumMemberModel> {
    const [code, comment] = await Promise.all([
        highlightCode(node.headerText ?? node.name),
        formatCommentRich(node.comment, context)
    ]);
    const member: EnumMemberModel = {
        id: memberFragment(node),
        label: node.name,
        summary: cloneCommentParagraphs(comment.paragraphs),
        signature: code,
        deprecationStatus: buildDeprecationStatusFromNodeLike(node, comment.deprecation)
    };

    const tags = collectMemberTags(node);
    if (tags.length) member.tags = tags;

    if (node.defaultValue) member.value = node.defaultValue;
    if (node.sourceUrl) member.sourceUrl = node.sourceUrl;

    return member;
}
