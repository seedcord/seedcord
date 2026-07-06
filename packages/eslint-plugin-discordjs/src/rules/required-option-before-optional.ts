import {
    booleanLiteralValue,
    extendsDjsType,
    chainRoot,
    collectChain,
    isChainTop,
    methodName
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

const SLASH_COMMAND_BUILDERS = new Set(['SlashCommandBuilder', 'SlashCommandSubcommandBuilder']);

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

function optionRequiredState(
    callback: TSESTree.CallExpressionArgument | undefined,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): OptionState {
    const chain = optionChain(callback);
    if (chain?.type !== AST_NODE_TYPES.CallExpression) return 'unknown';

    const setRequired = collectChain(chain).find((call) => methodName(call) === 'setRequired');
    if (!setRequired) return 'optional';

    const arg = setRequired.arguments[0];
    if (arg?.type === AST_NODE_TYPES.Literal && typeof arg.value === 'boolean') {
        return arg.value ? 'required' : 'optional';
    }
    if (arg === undefined || arg.type === AST_NODE_TYPES.SpreadElement) return 'unknown';
    // a const flag's boolean literal type is its value
    const value = booleanLiteralValue(checker, services.getTypeAtLocation(arg));
    if (value === undefined) return 'unknown';
    return value ? 'required' : 'optional';
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
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;
                if (!extendsDjsType(checker, services.getTypeAtLocation(chainRoot(node)), SLASH_COMMAND_BUILDERS))
                    return;

                // collectChain is outermost-first, reverse to source order
                const options = collectChain(node)
                    .filter((call) => ADD_OPTION.has(methodName(call) ?? ''))
                    .reverse()
                    .map((call) => ({ call, state: optionRequiredState(call.arguments[0], services, checker) }));
                if (options.length < 2) return;
                if (options.some((option) => option.state === 'unknown')) return;

                let seenOptional = false;
                for (const { call, state } of options) {
                    if (state === 'optional') {
                        seenOptional = true;
                    } else if (seenOptional) {
                        // so squiggle lands on the offending option
                        const target =
                            call.callee.type === AST_NODE_TYPES.MemberExpression ? call.callee.property : call;
                        context.report({ node: target, messageId: 'outOfOrder' });
                        return;
                    }
                }
            }
        };
    }
});
