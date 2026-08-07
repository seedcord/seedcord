import { extendsDjsType, methodName } from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

// the discord.js slash command and option builders, all requiring a lowercase chat-input name
const SLASH_BUILDERS = new Set([
    'SlashCommandBuilder',
    'SlashCommandSubcommandBuilder',
    'SlashCommandSubcommandGroupBuilder',
    'SlashCommandStringOption',
    'SlashCommandIntegerOption',
    'SlashCommandNumberOption',
    'SlashCommandBooleanOption',
    'SlashCommandUserOption',
    'SlashCommandChannelOption',
    'SlashCommandRoleOption',
    'SlashCommandMentionableOption',
    'SlashCommandAttachmentOption'
]);

// mirrors Discord's chat-input name character rule (\p{Ll} already excludes uppercase)
function isValidChatInputName(name: string): boolean {
    return /^[\p{Ll}\p{Lm}\p{Lo}\p{N}\p{sc=Devanagari}\p{sc=Thai}_-]{1,32}$/u.test(name);
}

function staticName(arg: TSESTree.CallExpressionArgument): string | undefined {
    if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') return arg.value;
    if (arg.type === AST_NODE_TYPES.TemplateLiteral && arg.expressions.length === 0) {
        return arg.quasis[0]?.value.cooked ?? undefined;
    }
    return undefined;
}

export default createRule({
    name: 'valid-command-name',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce Discord chat-input name rules on slash command and option names.'
        },
        messages: {
            invalidName:
                'This name is not a valid chat-input name. Use lowercase letters, digits, hyphens, or underscores, 1 to 32 characters.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        return {
            CallExpression(node) {
                if (methodName(node) !== 'setName') return;
                const arg = node.arguments[0];
                if (arg === undefined) return;
                let name = staticName(arg);
                // a const string's literal type is its value
                if (
                    name === undefined &&
                    (arg.type === AST_NODE_TYPES.Identifier || arg.type === AST_NODE_TYPES.MemberExpression)
                ) {
                    const argType = services.getTypeAtLocation(arg);
                    if (argType.isStringLiteral()) name = argType.value;
                }
                if (name === undefined || isValidChatInputName(name)) return;

                // a context menu name allows any case
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
                const checker = services.program.getTypeChecker();
                const receiverType = services.getTypeAtLocation(node.callee.object);
                if (!extendsDjsType(checker, receiverType, SLASH_BUILDERS)) return;

                context.report({ node: arg, messageId: 'invalidName' });
            }
        };
    }
});
