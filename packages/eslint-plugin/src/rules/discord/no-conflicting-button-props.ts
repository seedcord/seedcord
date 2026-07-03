import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { collectChain, isChainTop, methodName } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

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
