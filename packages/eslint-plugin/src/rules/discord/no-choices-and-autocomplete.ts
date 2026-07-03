import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { collectChain, isChainTop, methodName } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

function enablesAutocomplete(call: TSESTree.CallExpression): boolean {
    if (methodName(call) !== 'setAutocomplete') return false;
    const arg = call.arguments[0];
    return arg?.type === AST_NODE_TYPES.Literal && arg.value === true;
}

function declaresChoices(call: TSESTree.CallExpression): boolean {
    const name = methodName(call);
    if (name !== 'addChoices' && name !== 'setChoices') return false;
    // a spread of a runtime array is not a statically-known choice, so it does not count
    return call.arguments.some((arg) => arg.type !== AST_NODE_TYPES.SpreadElement);
}

export default createRule({
    name: 'no-choices-and-autocomplete',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow both autocomplete and choices on the same slash option.'
        },
        messages: {
            bothSet:
                'A slash option cannot enable autocomplete and declare choices at once, so building it throws a RangeError.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;
                const calls = collectChain(node);
                if (calls.some(enablesAutocomplete) && calls.some(declaresChoices)) {
                    context.report({ node, messageId: 'bothSet' });
                }
            }
        };
    }
});
