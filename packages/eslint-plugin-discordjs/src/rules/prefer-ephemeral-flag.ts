import { extendsDjsType, methodName, resolveConstInit } from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

const REPLY_METHODS = new Set(['reply', 'deferReply', 'followUp']);

function propertyName(property: TSESTree.ObjectLiteralElement): string | undefined {
    if (property.type !== AST_NODE_TYPES.Property || property.computed) return undefined;
    if (property.key.type === AST_NODE_TYPES.Identifier) return property.key.name;
    // a non-computed, non-identifier key is a string or number literal
    return typeof property.key.value === 'string' ? property.key.value : undefined;
}

function resolveOptions(
    sourceCode: TSESLint.SourceCode,
    arg: TSESTree.CallExpressionArgument | undefined
): TSESTree.ObjectExpression | undefined {
    if (arg?.type === AST_NODE_TYPES.ObjectExpression) return arg;
    if (arg?.type !== AST_NODE_TYPES.Identifier) return undefined;
    const init = resolveConstInit(sourceCode, arg);
    return init?.type === AST_NODE_TYPES.ObjectExpression ? init : undefined;
}

function canReplaceEphemeral(
    ephemeral: TSESTree.Property,
    options: TSESTree.ObjectExpression,
    messageFlagsAlias: string | undefined
): boolean {
    const hasFlags = options.properties.some((property) => propertyName(property) === 'flags');
    // a spread could already carry a flags key, so the autofix is skipped to avoid duplicating it
    const hasSpread = options.properties.some((property) => property.type === AST_NODE_TYPES.SpreadElement);
    const isTrue = ephemeral.value.type === AST_NODE_TYPES.Literal && ephemeral.value.value === true;
    return messageFlagsAlias !== undefined && !hasFlags && !hasSpread && isTrue;
}

// a reply method destructured off an interaction: `const { reply } = interaction; reply(...)`
function destructuredReply(
    node: TSESTree.CallExpression,
    sourceCode: TSESLint.SourceCode
): { name: string; init: TSESTree.Expression } | undefined {
    if (node.callee.type !== AST_NODE_TYPES.Identifier) return undefined;
    const calleeId = node.callee;
    const variable = sourceCode.getScope(node).references.find((ref) => ref.identifier === calleeId)?.resolved;
    const def = variable?.defs[0];
    if (def?.node.type !== AST_NODE_TYPES.VariableDeclarator) return undefined;
    const { id: pattern, init } = def.node;
    if (pattern.type !== AST_NODE_TYPES.ObjectPattern || !init) return undefined;
    const prop = pattern.properties.find(
        (p): p is TSESTree.Property =>
            p.type === AST_NODE_TYPES.Property &&
            !p.computed &&
            p.key.type === AST_NODE_TYPES.Identifier &&
            p.value.type === AST_NODE_TYPES.Identifier &&
            p.value.name === calleeId.name
    );
    if (prop?.key.type !== AST_NODE_TYPES.Identifier) return undefined;
    return { name: prop.key.name, init };
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
        let messageFlagsAlias: string | undefined;

        return {
            ImportDeclaration(node) {
                if (node.source.value !== 'discord.js') return;
                for (const spec of node.specifiers) {
                    if (
                        spec.type === AST_NODE_TYPES.ImportSpecifier &&
                        spec.imported.type === AST_NODE_TYPES.Identifier &&
                        spec.imported.name === 'MessageFlags'
                    ) {
                        messageFlagsAlias = spec.local.name;
                    }
                }
            },
            CallExpression(node) {
                let name: string | undefined;
                let receiverType: ts.Type | undefined;
                if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
                    name = methodName(node);
                    receiverType = services.getTypeAtLocation(node.callee.object);
                } else {
                    const reply = destructuredReply(node, context.sourceCode);
                    name = reply?.name;
                    receiverType = reply ? services.getTypeAtLocation(reply.init) : undefined;
                }
                if (name === undefined || !REPLY_METHODS.has(name) || receiverType === undefined) return;
                if (!extendsDjsType(checker, receiverType, 'BaseInteraction')) return;

                const options = resolveOptions(context.sourceCode, node.arguments[0]);
                if (options === undefined) return;

                const ephemeral = options.properties.find((property) => propertyName(property) === 'ephemeral');
                if (ephemeral?.type !== AST_NODE_TYPES.Property) return;

                const canFix = canReplaceEphemeral(ephemeral, options, messageFlagsAlias);
                context.report({
                    node: ephemeral,
                    messageId: 'deprecated',
                    fix: canFix
                        ? (fixer) => fixer.replaceText(ephemeral, `flags: ${messageFlagsAlias}.Ephemeral`)
                        : null
                });
            }
        };
    }
});
