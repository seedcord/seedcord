import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { isFromDiscordJs } from '../../typeUtils';
import { methodName } from '../../utils';

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

// matches Discord's chat-input name rule
function isValidChatInputName(name: string): boolean {
    return /^[-_\p{L}\p{N}]{1,32}$/u.test(name) && name === name.toLowerCase();
}

// the name when the argument is a static string: a plain literal or a template with no interpolation
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
                const name = staticName(arg);
                if (name === undefined || isValidChatInputName(name)) return;

                // a context menu name allows any case, so restrict the check to the discord.js slash builders
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
                const symbol = services.getTypeAtLocation(node.callee.object).getSymbol();
                if (symbol === undefined || !SLASH_BUILDERS.has(symbol.getName()) || !isFromDiscordJs(symbol)) return;

                context.report({ node: arg, messageId: 'invalidName' });
            }
        };
    }
});
