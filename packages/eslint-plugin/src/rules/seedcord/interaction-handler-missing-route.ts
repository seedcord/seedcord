import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { hasDecoratorNamed, isSeedcordSource } from '../../utils';

const BASE_TO_DECORATOR = {
    SlashHandler: 'SlashRoute',
    ButtonHandler: 'ButtonRoute',
    ModalHandler: 'ModalRoute',
    SelectMenuHandler: 'SelectMenuRoute',
    ContextMenuHandler: 'ContextMenuRoute',
    AutocompleteHandler: 'AutocompleteRoute'
} as const;

type HandlerBase = keyof typeof BASE_TO_DECORATOR;

const ROUTE_DECORATORS = new Set<string>(Object.values(BASE_TO_DECORATOR));

function isHandlerBase(name: string): name is HandlerBase {
    return name in BASE_TO_DECORATOR;
}

export default createRule({
    name: 'interaction-handler-missing-route',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require a route decorator on every concrete interaction handler.'
        },
        messages: {
            missingRoute:
                'This {{base}} has no @{{decorator}} decorator, so it never registers and its interactions fall through to UnhandledEvent.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const bases = new Map<string, HandlerBase>();

        return {
            ImportDeclaration(node) {
                if (typeof node.source.value !== 'string' || !isSeedcordSource(node.source.value)) return;
                for (const spec of node.specifiers) {
                    if (spec.type !== AST_NODE_TYPES.ImportSpecifier) continue;
                    if (spec.imported.type !== AST_NODE_TYPES.Identifier) continue;
                    if (isHandlerBase(spec.imported.name)) bases.set(spec.local.name, spec.imported.name);
                }
            },
            ClassDeclaration(node) {
                if (node.abstract) return;
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;

                const base = bases.get(node.superClass.name);
                if (!base) return;
                if (hasDecoratorNamed(node, ROUTE_DECORATORS)) return;

                context.report({
                    node: node.id ?? node,
                    messageId: 'missingRoute',
                    data: { base, decorator: BASE_TO_DECORATOR[base] }
                });
            }
        };
    }
});
