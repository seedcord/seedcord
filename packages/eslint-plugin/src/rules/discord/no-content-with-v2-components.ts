import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

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

        return {
            ObjectExpression(node) {
                const components = getProperty(node, 'components');
                if (components?.value.type !== AST_NODE_TYPES.ArrayExpression) return;

                const conflict = getProperty(node, 'content') ?? getProperty(node, 'embeds');
                if (!conflict) return;

                for (const element of components.value.elements) {
                    if (element === null || element.type === AST_NODE_TYPES.SpreadElement) continue;
                    const name = services.getTypeAtLocation(element).getSymbol()?.getName();
                    if (name !== undefined && V2_BUILDERS.has(name)) {
                        context.report({ node: conflict, messageId: 'v2WithContent' });
                        return;
                    }
                }
            }
        };
    }
});
