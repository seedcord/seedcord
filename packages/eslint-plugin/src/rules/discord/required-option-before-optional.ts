import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { collectChain, isChainTop, methodName } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

const ADD_OPTION = new Set([
    'addStringOption',
    'addIntegerOption',
    'addBooleanOption',
    'addUserOption',
    'addChannelOption',
    'addRoleOption',
    'addMentionableOption',
    'addNumberOption',
    'addAttachmentOption'
]);

type OptionState = 'required' | 'optional' | 'unknown';

// read an option builder callback's literal setRequired, unknown when it is dynamic or not a readable chain
function optionRequiredState(callback: TSESTree.CallExpressionArgument | undefined): OptionState {
    if (callback?.type !== AST_NODE_TYPES.ArrowFunctionExpression) return 'unknown';
    if (callback.body.type !== AST_NODE_TYPES.CallExpression) return 'unknown';

    const setRequired = collectChain(callback.body).find((call) => methodName(call) === 'setRequired');
    if (!setRequired) return 'optional';

    const arg = setRequired.arguments[0];
    if (arg?.type === AST_NODE_TYPES.Literal && typeof arg.value === 'boolean') {
        return arg.value ? 'required' : 'optional';
    }
    return 'unknown';
}

export default createRule({
    name: 'required-option-before-optional',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow a required slash option after an optional one.'
        },
        messages: {
            outOfOrder: 'A required slash option cannot come after an optional one.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;

                // collectChain is outermost-first, reverse to source order
                const optionCalls = collectChain(node)
                    .filter((call) => ADD_OPTION.has(methodName(call) ?? ''))
                    .reverse();
                if (optionCalls.length < 2) return;

                const states = optionCalls.map((call) => optionRequiredState(call.arguments[0]));
                if (states.includes('unknown')) return;

                let seenOptional = false;
                for (const [index, state] of states.entries()) {
                    if (state === 'optional') {
                        seenOptional = true;
                    } else if (seenOptional) {
                        context.report({ node: optionCalls[index] ?? node, messageId: 'outOfOrder' });
                        return;
                    }
                }
            }
        };
    }
});
