import { buildMemberSummary } from './buildMemberSummary';
import { buildTypeParameterSummaries } from './buildTypeParameterSummaries';

import type { BaseEntityModel, ClassLikeEntityModel, EntityMemberSummary, FormatContext } from '#lib/docs/types';
import type { DocNode } from '@seedcord/docs-engine';

const PROPERTY_KINDS = new Set(['kind_property', 'kind_accessor']);
const METHOD_KINDS = new Set(['kind_method']);
const CONSTRUCTOR_KIND = 'kind_constructor';

export async function buildClassLikeEntity<Kind extends 'class' | 'interface'>(
    base: BaseEntityModel & { kind: Kind },
    node: DocNode,
    context: FormatContext
): Promise<ClassLikeEntityModel & { kind: Kind }> {
    const propertyNodes: DocNode[] = [];
    const constructorNodes: DocNode[] = [];
    const methodNodes: DocNode[] = [];

    for (const child of node.children) {
        // an @internal member stays reachable by its direct link
        if (child.flags.isInternal) continue;
        if (PROPERTY_KINDS.has(child.kindLabel)) propertyNodes.push(child);
        else if (child.kindLabel === CONSTRUCTOR_KIND) constructorNodes.push(child);
        else if (METHOD_KINDS.has(child.kindLabel)) methodNodes.push(child);
    }

    const summarize = (children: DocNode[]): Promise<EntityMemberSummary[]> =>
        Promise.all(children.map((child) => buildMemberSummary(child, context)));

    const [properties, constructors, methods, typeParameters] = await Promise.all([
        summarize(propertyNodes),
        summarize(constructorNodes),
        summarize(methodNodes),
        buildTypeParameterSummaries(node.header, context, node.typeParameters)
    ]);

    return {
        ...base,
        typeParameters,
        constructors,
        properties,
        methods
    };
}
