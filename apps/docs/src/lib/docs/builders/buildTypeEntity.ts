import { buildTypeParameterSummaries } from './buildTypeParameterSummaries';

import type { BaseEntityModel, FormatContext, TypeEntityModel } from '../types';
import type { DocNode } from '@seedcord/docs-engine';

export async function buildTypeEntity(
    base: BaseEntityModel & { kind: 'type' },
    node: DocNode,
    context: FormatContext
): Promise<TypeEntityModel> {
    const typeParameters = await buildTypeParameterSummaries(node.header, context, node.typeParameters);
    return { ...base, declaration: base.signature, typeParameters };
}
