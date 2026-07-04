import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsDjsType } from '../../typeUtils';

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

                let arg = node.arguments[0];
                if (!arg) return;

                // unwrap as / satisfies / <T> so a raw literal behind them is still caught
                while (
                    arg.type === AST_NODE_TYPES.TSAsExpression ||
                    arg.type === AST_NODE_TYPES.TSTypeAssertion ||
                    arg.type === AST_NODE_TYPES.TSSatisfiesExpression
                ) {
                    arg = arg.expression;
                }

                const isStringLiteral = arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string';
                const isTemplate = arg.type === AST_NODE_TYPES.TemplateLiteral;
                const isConcat = arg.type === AST_NODE_TYPES.BinaryExpression;
                if (isStringLiteral || isTemplate || isConcat) {
                    context.report({ node: arg, messageId: 'rawCustomId' });
                }
            }
        };
    }
});
