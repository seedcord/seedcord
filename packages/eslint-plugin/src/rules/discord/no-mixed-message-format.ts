import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { isFromDiscordJs } from '../../typeUtils';

import type { TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

const V2_BUILDERS = new Set([
    'ContainerBuilder',
    'SectionBuilder',
    'TextDisplayBuilder',
    'MediaGalleryBuilder',
    'FileBuilder',
    'SeparatorBuilder'
]);

function getProperty(node: TSESTree.ObjectExpression, name: string): TSESTree.Property | undefined {
    for (const prop of node.properties) {
        if (prop.type !== AST_NODE_TYPES.Property) continue;
        const { key } = prop;
        if (key.type === AST_NODE_TYPES.Identifier && key.name === name) return prop;
        if (key.type === AST_NODE_TYPES.Literal && key.value === name) return prop;
    }
    return undefined;
}

function isV2Type(type: ts.Type): boolean {
    if (type.isUnion()) return type.types.some(isV2Type);
    const symbol = type.getSymbol();
    return symbol !== undefined && V2_BUILDERS.has(symbol.getName()) && isFromDiscordJs(symbol);
}

export default createRule({
    name: 'no-content-with-v2-components',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow content or embeds on a message that uses a components v2 builder.'
        },
        messages: {
            v2WithContent: 'A components v2 message cannot also set content or embeds. Discord rejects the payload.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        function holdsV2(value: TSESTree.Node): boolean {
            if (value.type === AST_NODE_TYPES.ArrayExpression) {
                return value.elements.some((element) => {
                    if (element === null) return false;
                    if (element.type === AST_NODE_TYPES.SpreadElement) {
                        const elementType = services.getTypeAtLocation(element.argument).getNumberIndexType();
                        return elementType !== undefined && isV2Type(elementType);
                    }
                    return isV2Type(services.getTypeAtLocation(element));
                });
            }
            const elementType = services.getTypeAtLocation(value).getNumberIndexType();
            return elementType !== undefined && isV2Type(elementType);
        }

        // content or embeds can arrive through a spread of another object, so check the spread's type too
        function findConflictSpread(node: TSESTree.ObjectExpression): TSESTree.SpreadElement | undefined {
            for (const prop of node.properties) {
                if (prop.type !== AST_NODE_TYPES.SpreadElement) continue;
                const type = services.getTypeAtLocation(prop.argument);
                if (type.getProperty('content') !== undefined || type.getProperty('embeds') !== undefined) return prop;
            }
            return undefined;
        }

        return {
            ObjectExpression(node) {
                const components = getProperty(node, 'components');
                if (components === undefined) return;

                const conflict =
                    getProperty(node, 'content') ?? getProperty(node, 'embeds') ?? findConflictSpread(node);
                if (conflict === undefined) return;

                if (holdsV2(components.value)) {
                    context.report({ node: conflict, messageId: 'v2WithContent' });
                }
            }
        };
    }
});
