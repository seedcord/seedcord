import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

function methodName(call: TSESTree.CallExpression): string | undefined {
    const { callee } = call;
    if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return undefined;
    if (callee.property.type !== AST_NODE_TYPES.Identifier) return undefined;
    return callee.property.name;
}

function collectChain(top: TSESTree.CallExpression): TSESTree.CallExpression[] {
    const calls: TSESTree.CallExpression[] = [];
    let current: TSESTree.Node = top;
    while (current.type === AST_NODE_TYPES.CallExpression && current.callee.type === AST_NODE_TYPES.MemberExpression) {
        calls.push(current);
        current = current.callee.object;
    }
    return calls;
}

function isChainTop(node: TSESTree.CallExpression): boolean {
    const { parent } = node;
    return parent.type !== AST_NODE_TYPES.MemberExpression || parent.object !== node;
}

function setsLinkStyle(call: TSESTree.CallExpression): boolean {
    if (methodName(call) !== 'setStyle') return false;
    const arg = call.arguments[0];
    return (
        arg?.type === AST_NODE_TYPES.MemberExpression &&
        arg.object.type === AST_NODE_TYPES.Identifier &&
        arg.object.name === 'ButtonStyle' &&
        arg.property.type === AST_NODE_TYPES.Identifier &&
        arg.property.name === 'Link'
    );
}

export default createRule({
    name: 'no-conflicting-button-props',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow conflicting props on a button builder.'
        },
        messages: {
            idAndUrl: 'A button cannot set both a customId and a url.',
            linkWithCustomId: 'A link button uses a url and cannot have a customId.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;
                const calls = collectChain(node);
                const hasCustomId = calls.some((call) => methodName(call) === 'setCustomId');
                const hasUrl = calls.some((call) => methodName(call) === 'setURL');

                if (hasCustomId && hasUrl) {
                    context.report({ node, messageId: 'idAndUrl' });
                } else if (hasCustomId && calls.some(setsLinkStyle)) {
                    context.report({ node, messageId: 'linkWithCustomId' });
                }
            }
        };
    }
});
