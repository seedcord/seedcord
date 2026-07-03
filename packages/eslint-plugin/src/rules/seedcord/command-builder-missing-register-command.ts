import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { hasDecoratorNamed, isSeedcordSource } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

const KIND_LABEL = {
    command: 'slash command',
    context_menu: 'context menu command'
} as const;

type CommandKind = keyof typeof KIND_LABEL;

const REGISTER_COMMAND = new Set(['RegisterCommand']);

function isCommandKind(value: string): value is CommandKind {
    return value in KIND_LABEL;
}

function commandKindOf(node: TSESTree.ClassDeclaration): CommandKind | undefined {
    const first = node.superTypeArguments?.params[0];
    if (first?.type !== AST_NODE_TYPES.TSLiteralType) return undefined;
    const { literal } = first;
    if (literal.type !== AST_NODE_TYPES.Literal || typeof literal.value !== 'string') return undefined;
    return isCommandKind(literal.value) ? literal.value : undefined;
}

export default createRule({
    name: 'command-builder-missing-register-command',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require @RegisterCommand on every command builder.'
        },
        messages: {
            missingRegister: 'This {{label}} has no @RegisterCommand decorator, so it never deploys to Discord.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const builderComponentNames = new Set<string>();

        return {
            ImportDeclaration(node) {
                if (typeof node.source.value !== 'string' || !isSeedcordSource(node.source.value)) return;
                for (const spec of node.specifiers) {
                    if (spec.type !== AST_NODE_TYPES.ImportSpecifier) continue;
                    if (spec.imported.type !== AST_NODE_TYPES.Identifier) continue;
                    if (spec.imported.name === 'BuilderComponent') builderComponentNames.add(spec.local.name);
                }
            },
            ClassDeclaration(node) {
                if (node.abstract) return;
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;
                if (!builderComponentNames.has(node.superClass.name)) return;

                const kind = commandKindOf(node);
                if (!kind || hasDecoratorNamed(node, REGISTER_COMMAND)) return;

                context.report({
                    node: node.id ?? node,
                    messageId: 'missingRegister',
                    data: { label: KIND_LABEL[kind] }
                });
            }
        };
    }
});
