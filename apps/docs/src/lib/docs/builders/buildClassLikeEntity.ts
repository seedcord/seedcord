import { buildMemberSummary } from './buildMemberSummary';
import { buildTypeParameterSummaries } from './buildTypeParameterSummaries';

import type { BaseEntityModel, ClassLikeEntityModel, FormatContext } from '../types';
import type { DocNode } from '@seedcord/docs-engine';

const PROPERTY_KINDS = new Set(['kind_property', 'kind_accessor']);
const METHOD_KINDS = new Set(['kind_method']);
const CONSTRUCTOR_KIND = 'kind_constructor';

export async function buildClassLikeEntity<Kind extends 'class' | 'interface'>(
    base: BaseEntityModel & { kind: Kind },
    node: DocNode,
    context: FormatContext
): Promise<ClassLikeEntityModel & { kind: Kind }> {
    const properties = await Promise.all(
        node.children
            .filter((child) => PROPERTY_KINDS.has(child.kindLabel))
            .map((child) => buildMemberSummary(child, context))
    );

    const constructors = await Promise.all(
        node.children
            .filter((child) => child.kindLabel === CONSTRUCTOR_KIND)
            .map((child) => buildMemberSummary(child, context))
    );

    const methods = await Promise.all(
        node.children
            .filter((child) => METHOD_KINDS.has(child.kindLabel))
            .map((child) => buildMemberSummary(child, context))
    );

    const typeParameters = await buildTypeParameterSummaries(node.header, context, node.typeParameters);

    return {
        ...base,
        typeParameters,
        constructors,
        properties,
        methods
    };
}
