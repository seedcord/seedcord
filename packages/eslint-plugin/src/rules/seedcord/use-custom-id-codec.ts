import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';

export default createRule({
    name: 'use-custom-id-codec',
    meta: {
        type: 'problem',
        docs: {
            description:
                'Disallow hand-written customId strings in setCustomId. Build the id through the typed CustomId codec instead.'
        },
        messages: {
            rawCustomId:
                'Hand-written customId. Build it through the typed CustomId codec (CustomId.encode()) so its route and params stay in sync.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                const { callee } = node;
                if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return;
                if (callee.property.type !== AST_NODE_TYPES.Identifier || callee.property.name !== 'setCustomId')
                    return;

                const arg = node.arguments[0];
                if (!arg) return;

                const isStringLiteral = arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string';
                const isTemplate = arg.type === AST_NODE_TYPES.TemplateLiteral;
                if (isStringLiteral || isTemplate) {
                    context.report({ node: arg, messageId: 'rawCustomId' });
                }
            }
        };
    }
});
