import { buildEnumMember } from './buildEnumMember';

import type { BaseEntityModel, EnumEntityModel, FormatContext } from '../types';
import type { DocNode } from '@seedcord/docs-engine';

const ENUM_MEMBER_KIND = 'kind_enum_member';

export async function buildEnumEntity(
    base: BaseEntityModel & { kind: 'enum' },
    node: DocNode,
    context: FormatContext
): Promise<EnumEntityModel> {
    const members = await Promise.all(
        node.children
            .filter((child) => child.kindLabel === ENUM_MEMBER_KIND)
            .map((child) => buildEnumMember(child, context))
    );

    return { ...base, members };
}
