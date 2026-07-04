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

// the option-builder expression a callback returns: its expression body, or the return of a block body
function optionChain(callback: TSESTree.CallExpressionArgument | undefined): TSESTree.Expression | undefined {
    if (
        callback?.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
        callback?.type !== AST_NODE_TYPES.FunctionExpression
    ) {
        return undefined;
    }
    if (callback.body.type !== AST_NODE_TYPES.BlockStatement) return callback.body;
    for (const statement of callback.body.body) {
        if (statement.type === AST_NODE_TYPES.ReturnStatement) return statement.argument ?? undefined;
    }
    return undefined;
}

// read an option builder callback's literal setRequired, unknown when it is dynamic or not a readable chain
function optionRequiredState(callback: TSESTree.CallExpressionArgument | undefined): OptionState {
    const chain = optionChain(callback);
    if (chain?.type !== AST_NODE_TYPES.CallExpression) return 'unknown';

    const setRequired = collectChain(chain).find((call) => methodName(call) === 'setRequired');
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
                const options = collectChain(node)
                    .filter((call) => ADD_OPTION.has(methodName(call) ?? ''))
                    .reverse()
                    .map((call) => ({ call, state: optionRequiredState(call.arguments[0]) }));
                if (options.length < 2) return;
                if (options.some((option) => option.state === 'unknown')) return;

                let seenOptional = false;
                for (const { call, state } of options) {
                    if (state === 'optional') {
                        seenOptional = true;
                    } else if (seenOptional) {
                        context.report({ node: call, messageId: 'outOfOrder' });
                        return;
                    }
                }
            }
        };
    }
});
