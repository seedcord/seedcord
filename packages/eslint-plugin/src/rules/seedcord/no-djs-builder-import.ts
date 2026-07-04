import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

// discord.js re-exports a separate CJS copy of these builders, which breaks instanceof and toJSON when one
// is nested in a seedcord (ESM) component. they must come from @discordjs/builders.
const BUILDERS = new Set([
    'ActionRowBuilder',
    'ButtonBuilder',
    'ChannelSelectMenuBuilder',
    'CheckboxBuilder',
    'CheckboxGroupBuilder',
    'CheckboxGroupOptionBuilder',
    'ContainerBuilder',
    'ContextMenuCommandBuilder',
    'EmbedBuilder',
    'FileBuilder',
    'FileUploadBuilder',
    'LabelBuilder',
    'MediaGalleryBuilder',
    'MediaGalleryItemBuilder',
    'MentionableSelectMenuBuilder',
    'ModalBuilder',
    'RadioGroupBuilder',
    'RadioGroupOptionBuilder',
    'RoleSelectMenuBuilder',
    'SectionBuilder',
    'SeparatorBuilder',
    'SlashCommandBuilder',
    'SlashCommandSubcommandBuilder',
    'SlashCommandSubcommandGroupBuilder',
    'StringSelectMenuBuilder',
    'StringSelectMenuOptionBuilder',
    'TextDisplayBuilder',
    'TextInputBuilder',
    'ThumbnailBuilder',
    'UserSelectMenuBuilder'
]);

type Report = (node: TSESTree.Node) => void;

function findVariable(scope: TSESLint.Scope.Scope, name: string): TSESLint.Scope.Variable | undefined {
    let current: TSESLint.Scope.Scope | null = scope;
    while (current !== null) {
        const v = current.set.get(name);
        if (v !== undefined) return v;
        current = current.upper;
    }
    return undefined;
}

function isDiscordJs(node: TSESTree.Node): boolean {
    return node.type === AST_NODE_TYPES.Literal && node.value === 'discord.js';
}

function reportObjectPattern(pattern: TSESTree.ObjectPattern, report: Report): void {
    for (const prop of pattern.properties) {
        if (
            prop.type === AST_NODE_TYPES.Property &&
            prop.key.type === AST_NODE_TYPES.Identifier &&
            BUILDERS.has(prop.key.name)
        ) {
            report(prop);
        }
    }
}

// first param of a `.then(callback)` on the module, either destructured or a named alias
function thenCallbackParam(
    consumer: TSESTree.MemberExpression
): TSESTree.ObjectPattern | TSESTree.Identifier | undefined {
    if (consumer.property.type !== AST_NODE_TYPES.Identifier || consumer.property.name !== 'then') return undefined;
    if (consumer.parent.type !== AST_NODE_TYPES.CallExpression) return undefined;

    const callback = consumer.parent.arguments[0];
    const param =
        callback?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        callback?.type === AST_NODE_TYPES.FunctionExpression
            ? callback.params[0]
            : undefined;
    if (param?.type === AST_NODE_TYPES.ObjectPattern || param?.type === AST_NODE_TYPES.Identifier) return param;
    return undefined;
}

// a destructure or member access off require('discord.js') / import('discord.js')
function checkModuleConsumer(moduleExpr: TSESTree.Node, report: Report, bindings: Set<TSESTree.Node>): void {
    let consumer = moduleExpr.parent;
    if (consumer?.type === AST_NODE_TYPES.AwaitExpression) consumer = consumer.parent;
    if (consumer === undefined) return;

    if (consumer.type === AST_NODE_TYPES.VariableDeclarator && consumer.id.type === AST_NODE_TYPES.ObjectPattern) {
        reportObjectPattern(consumer.id, report);
        return;
    }
    if (consumer.type !== AST_NODE_TYPES.MemberExpression || consumer.property.type !== AST_NODE_TYPES.Identifier) {
        return;
    }
    if (BUILDERS.has(consumer.property.name)) {
        report(consumer);
        return;
    }
    const param = thenCallbackParam(consumer);
    if (param === undefined) return;
    if (param.type === AST_NODE_TYPES.ObjectPattern) {
        reportObjectPattern(param, report);
    } else {
        // named alias: track it so MemberExpression picks up djs.Builder accesses inside the callback
        bindings.add(param);
    }
}

export default createRule({
    name: 'no-djs-builder-import',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow importing component builders from discord.js instead of @discordjs/builders.'
        },
        messages: {
            useBuildersPkg:
                "Import component builders from '@discordjs/builders'. The discord.js re-export is a separate CJS copy that breaks instanceof and toJSON when nested in a seedcord component."
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const bindings = new Set<TSESTree.Node>();
        const report: Report = (node) => context.report({ node, messageId: 'useBuildersPkg' });

        return {
            ImportDeclaration(node) {
                // a type-only import is erased, so no CJS copy reaches runtime
                if (node.importKind === 'type' || !isDiscordJs(node.source)) return;
                for (const spec of node.specifiers) {
                    if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
                        bindings.add(spec.local);
                    } else if (
                        spec.type === AST_NODE_TYPES.ImportSpecifier &&
                        spec.importKind !== 'type' &&
                        spec.imported.type === AST_NODE_TYPES.Identifier &&
                        BUILDERS.has(spec.imported.name)
                    ) {
                        report(spec);
                    }
                }
            },
            ExportNamedDeclaration(node) {
                if (node.exportKind === 'type' || !node.source || !isDiscordJs(node.source)) return;
                for (const spec of node.specifiers) {
                    if (
                        spec.exportKind !== 'type' &&
                        spec.local.type === AST_NODE_TYPES.Identifier &&
                        BUILDERS.has(spec.local.name)
                    ) {
                        report(spec);
                    }
                }
            },
            MemberExpression(node) {
                if (
                    node.object.type !== AST_NODE_TYPES.Identifier ||
                    node.property.type !== AST_NODE_TYPES.Identifier ||
                    !BUILDERS.has(node.property.name)
                )
                    return;
                const scope = context.sourceCode.getScope(node);
                const variable = findVariable(scope, node.object.name);
                if (variable?.defs.some((def) => bindings.has(def.name))) {
                    report(node);
                }
            },
            CallExpression(node) {
                if (
                    node.callee.type === AST_NODE_TYPES.Identifier &&
                    node.callee.name === 'require' &&
                    node.arguments[0] !== undefined &&
                    isDiscordJs(node.arguments[0])
                ) {
                    checkModuleConsumer(node, report, bindings);
                }
            },
            ImportExpression(node) {
                if (isDiscordJs(node.source)) checkModuleConsumer(node, report, bindings);
            }
        };
    }
});
