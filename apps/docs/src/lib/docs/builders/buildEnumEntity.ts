import { buildEnumMember } from './buildEnumMember';

import type { BaseEntityModel, EnumEntityModel, EnumMemberModel, FormatContext } from '#lib/docs/types';
import type { DocNode } from '@seedcord/docs-engine';

const ENUM_MEMBER_KIND = 'kind_enum_member';

export async function buildEnumEntity(
    base: BaseEntityModel & { kind: 'enum' },
    node: DocNode,
    context: FormatContext
): Promise<EnumEntityModel> {
    const pending: Promise<EnumMemberModel>[] = [];
    for (const child of node.children) {
        if (child.kindLabel !== ENUM_MEMBER_KIND || child.flags.isInternal) continue;
        pending.push(buildEnumMember(child, context));
    }

    const members = await Promise.all(pending);

    return { ...base, members };
}
