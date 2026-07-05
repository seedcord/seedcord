import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsDjsType } from '../../typeUtils';
import { resolveConstInit } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

// discord.js component builders that carry a customId
const CUSTOM_ID_BUILDERS = new Set([
    'ButtonBuilder',
    'StringSelectMenuBuilder',
    'UserSelectMenuBuilder',
    'RoleSelectMenuBuilder',
    'ChannelSelectMenuBuilder',
    'MentionableSelectMenuBuilder',
    'ModalBuilder',
    'TextInputBuilder'
]);

// unwrap as / satisfies / <T> so a raw literal behind them is still flagged
function unwrapAssertions(expr: TSESTree.Expression): TSESTree.Expression {
    let current = expr;
    while (
        current.type === AST_NODE_TYPES.TSAsExpression ||
        current.type === AST_NODE_TYPES.TSTypeAssertion ||
        current.type === AST_NODE_TYPES.TSSatisfiesExpression
    ) {
        current = current.expression;
    }
    return current;
}

function isRawString(expr: TSESTree.Expression): boolean {
    if (expr.type === AST_NODE_TYPES.Literal) return typeof expr.value === 'string';
    return expr.type === AST_NODE_TYPES.TemplateLiteral || expr.type === AST_NODE_TYPES.BinaryExpression;
}

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
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            CallExpression(node) {
                const { callee } = node;
                if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return;
                if (callee.property.type !== AST_NODE_TYPES.Identifier || callee.property.name !== 'setCustomId')
                    return;
                if (!extendsDjsType(checker, services.getTypeAtLocation(callee.object), CUSTOM_ID_BUILDERS)) return;

                const arg = node.arguments[0];
                if (!arg || arg.type === AST_NODE_TYPES.SpreadElement) return;

                let target = unwrapAssertions(arg);
                if (target.type === AST_NODE_TYPES.Identifier) {
                    const init = resolveConstInit(context.sourceCode, target);
                    if (init === undefined) return;
                    target = unwrapAssertions(init);
                }

                // report at the argument, a shared init would collapse several call sites into one report
                if (isRawString(target)) context.report({ node: arg, messageId: 'rawCustomId' });
            }
        };
    }
});
