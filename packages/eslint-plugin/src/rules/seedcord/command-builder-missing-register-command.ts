import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsSeedcordType } from '../../typeUtils';
import { forEachSeedcordImport, hasDecoratorNamed } from '../../utils';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

const KIND_LABEL = {
    command: 'slash command',
    context_menu: 'context menu command'
} as const;

type CommandKind = keyof typeof KIND_LABEL;

const REGISTER_COMMAND = new Set(['RegisterCommand']);
const BUILDER_COMPONENT = 'BuilderComponent';

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

// the command kind for a class whose BuilderComponent base is imported from another file
function crossFileCommandKind(
    node: TSESTree.ClassDeclaration,
    checker: ts.TypeChecker,
    services: ParserServicesWithTypeInformation
): CommandKind | undefined {
    if (!node.id) return undefined;
    const symbol = services.getSymbolAtLocation(node.id);
    if (!symbol) return undefined;
    const classType = checker.getDeclaredTypeOfSymbol(symbol);
    if (!extendsSeedcordType(checker, classType, BUILDER_COMPONENT)) return undefined;
    const typeProperty = classType.getProperty('type');
    if (!typeProperty) return undefined;
    const kindType = checker.getTypeOfSymbolAtLocation(typeProperty, services.esTreeNodeToTSNodeMap.get(node));
    return kindType.isStringLiteral() && isCommandKind(kindType.value) ? kindType.value : undefined;
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
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const builderComponentNames = new Set<string>();
        const intermediateKinds = new Map<string, CommandKind>();

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (imported === BUILDER_COMPONENT) builderComponentNames.add(local);
                });
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;
                const superName = node.superClass.name;

                let kind: CommandKind | undefined;
                if (builderComponentNames.has(superName)) kind = commandKindOf(node);
                else if (intermediateKinds.has(superName)) kind = intermediateKinds.get(superName);
                else kind = crossFileCommandKind(node, checker, services);
                if (kind === undefined) return;

                // an abstract subclass carries the kind to later concrete commands (same-file intermediate)
                if (node.abstract) {
                    if (node.id) intermediateKinds.set(node.id.name, kind);
                    return;
                }
                if (hasDecoratorNamed(node, REGISTER_COMMAND)) return;

                context.report({
                    node: node.id ?? node,
                    messageId: 'missingRegister',
                    data: { label: KIND_LABEL[kind] }
                });
            }
        };
    }
});
