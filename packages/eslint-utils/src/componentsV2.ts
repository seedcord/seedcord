import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { extendsDjsType } from './typeUtils';
import { propertyKeyIs } from './utils';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

// the components v2 layout builders that require the IsComponentsV2 message flag
const V2_BUILDERS = new Set([
    'ContainerBuilder',
    'SectionBuilder',
    'TextDisplayBuilder',
    'MediaGalleryBuilder',
    'FileBuilder',
    'SeparatorBuilder',
    'ThumbnailBuilder'
]);

// the base-chain walk also catches user subclasses of a v2 builder
function isV2Type(type: ts.Type, checker: ts.TypeChecker): boolean {
    return extendsDjsType(checker, type, V2_BUILDERS);
}

function arrayHoldsV2(type: ts.Type | undefined, checker: ts.TypeChecker): boolean {
    const elementType = type?.getNumberIndexType();
    return elementType !== undefined && isV2Type(elementType, checker);
}

function componentsValueIsV2(
    value: TSESTree.Node,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): boolean {
    if (value.type === AST_NODE_TYPES.ArrayExpression) {
        return value.elements.some((element) => {
            if (element === null) return false;
            if (element.type === AST_NODE_TYPES.SpreadElement) {
                return arrayHoldsV2(services.getTypeAtLocation(element.argument), checker);
            }
            return isV2Type(services.getTypeAtLocation(element), checker);
        });
    }
    return arrayHoldsV2(services.getTypeAtLocation(value), checker);
}

// object properties apply left to right, so the last components contributor (a key or a spread) wins
export function hasV2Components(
    node: TSESTree.ObjectExpression,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): boolean {
    let holdsV2 = false;
    for (const prop of node.properties) {
        if (prop.type === AST_NODE_TYPES.Property && propertyKeyIs(prop, 'components')) {
            holdsV2 = componentsValueIsV2(prop.value, services, checker);
        } else if (prop.type === AST_NODE_TYPES.SpreadElement) {
            const symbol = services.getTypeAtLocation(prop.argument).getProperty('components');
            if (symbol !== undefined) holdsV2 = arrayHoldsV2(checker.getTypeOfSymbol(symbol), checker);
        }
    }
    return holdsV2;
}
