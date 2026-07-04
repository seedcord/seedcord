import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsDjsType } from '../../typeUtils';
import { methodName } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

const REPLY_METHODS = new Set(['reply', 'deferReply', 'followUp']);

function propertyName(property: TSESTree.ObjectLiteralElement): string | undefined {
    if (property.type !== AST_NODE_TYPES.Property || property.computed) return undefined;
    if (property.key.type === AST_NODE_TYPES.Identifier) return property.key.name;
    // a non-computed, non-identifier key is a string or number literal
    return typeof property.key.value === 'string' ? property.key.value : undefined;
}

export default createRule({
    name: 'prefer-ephemeral-flag',
    meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: {
            description: 'Disallow the deprecated ephemeral reply option in favor of MessageFlags.Ephemeral.'
        },
        messages: {
            deprecated: 'The ephemeral reply option is deprecated. Use flags: MessageFlags.Ephemeral.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        let messageFlagsImported = false;

        // the options object, inline or resolved from a same-scope const variable
        function resolveOptions(
            arg: TSESTree.CallExpressionArgument | undefined
        ): TSESTree.ObjectExpression | undefined {
            if (arg?.type === AST_NODE_TYPES.ObjectExpression) return arg;
            if (arg?.type !== AST_NODE_TYPES.Identifier) return undefined;

            const variable = context.sourceCode
                .getScope(arg)
                .references.find((reference) => reference.identifier === arg)?.resolved;
            const definition = variable?.defs[0];
            if (
                definition?.node.type === AST_NODE_TYPES.VariableDeclarator &&
                definition.node.init?.type === AST_NODE_TYPES.ObjectExpression
            ) {
                return definition.node.init;
            }
            return undefined;
        }

        return {
            ImportDeclaration(node) {
                if (node.source.value !== 'discord.js') return;
                for (const spec of node.specifiers) {
                    if (
                        spec.type === AST_NODE_TYPES.ImportSpecifier &&
                        spec.imported.type === AST_NODE_TYPES.Identifier &&
                        spec.imported.name === 'MessageFlags'
                    ) {
                        messageFlagsImported = true;
                    }
                }
            },
            CallExpression(node) {
                const name = methodName(node);
                if (!name || !REPLY_METHODS.has(name)) return;
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
                if (!extendsDjsType(checker, services.getTypeAtLocation(node.callee.object), 'BaseInteraction')) return;

                const options = resolveOptions(node.arguments[0]);
                if (options === undefined) return;

                const ephemeral = options.properties.find((property) => propertyName(property) === 'ephemeral');
                if (ephemeral?.type !== AST_NODE_TYPES.Property) return;

                const hasFlags = options.properties.some((property) => propertyName(property) === 'flags');
                const hasSpread = options.properties.some((property) => property.type === AST_NODE_TYPES.SpreadElement);
                const isTrue = ephemeral.value.type === AST_NODE_TYPES.Literal && ephemeral.value.value === true;
                const canFix = messageFlagsImported && !hasFlags && !hasSpread && isTrue;

                context.report({
                    node: ephemeral,
                    messageId: 'deprecated',
                    fix: canFix ? (fixer) => fixer.replaceText(ephemeral, 'flags: MessageFlags.Ephemeral') : null
                });
            }
        };
    }
});
