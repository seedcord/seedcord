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

        // a type, one of its union members, or an array element type that is a discord.js v2 builder
        function isV2Type(type: ts.Type): boolean {
            if (type.isUnion()) return type.types.some(isV2Type);
            const symbol = type.getSymbol();
            return symbol !== undefined && V2_BUILDERS.has(symbol.getName()) && isFromDiscordJs(symbol);
        }

        // whether the components value holds a v2 builder, as an inline array or a variable array
        function holdsV2(value: TSESTree.Node): boolean {
            if (value.type === AST_NODE_TYPES.ArrayExpression) {
                return value.elements.some(
                    (element) =>
                        element !== null &&
                        element.type !== AST_NODE_TYPES.SpreadElement &&
                        isV2Type(services.getTypeAtLocation(element))
                );
            }
            const elementType = services.getTypeAtLocation(value).getNumberIndexType();
            return elementType !== undefined && isV2Type(elementType);
        }

        return {
            ObjectExpression(node) {
                const components = getProperty(node, 'components');
                if (components === undefined) return;

                const conflict = getProperty(node, 'content') ?? getProperty(node, 'embeds');
                if (conflict === undefined) return;

                if (holdsV2(components.value)) {
                    context.report({ node: conflict, messageId: 'v2WithContent' });
                }
            }
        };
    }
});
