import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

function methodName(call: TSESTree.CallExpression): string | undefined {
    const { callee } = call;
    if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return undefined;
    if (callee.property.type !== AST_NODE_TYPES.Identifier) return undefined;
    return callee.property.name;
}

// walk a fluent chain from its outermost call down through each `.method()` link
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
