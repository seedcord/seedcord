import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { methodName } from '../../utils';

// matches Discord's chat-input name rule
function isValidChatInputName(name: string): boolean {
    return /^[-_\p{L}\p{N}]{1,32}$/u.test(name) && name === name.toLowerCase();
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
                if (arg?.type !== AST_NODE_TYPES.Literal || typeof arg.value !== 'string') return;
                if (isValidChatInputName(arg.value)) return;

                // a context menu name allows any case, so the lowercase rule applies to slash builders only
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
                const builderName = services.getTypeAtLocation(node.callee.object).getSymbol()?.getName();
                if (!builderName?.startsWith('SlashCommand')) return;

                context.report({ node: arg, messageId: 'invalidName' });
            }
        };
    }
});
