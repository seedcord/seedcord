import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsSeedcordType } from '../../typeUtils';
import { forEachSeedcordImport, hasDecoratorNamed } from '../../utils';

const BASE_TO_DECORATOR = {
    SlashHandler: 'SlashRoute',
    ButtonHandler: 'ButtonRoute',
    ModalHandler: 'ModalRoute',
    SelectMenuHandler: 'SelectMenuRoute',
    ContextMenuHandler: 'ContextMenuRoute',
    AutocompleteHandler: 'AutocompleteRoute'
} as const;

type HandlerBase = keyof typeof BASE_TO_DECORATOR;

const HANDLER_BASE_NAMES = Object.keys(BASE_TO_DECORATOR) as HandlerBase[];

const DECORATOR_SETS = HANDLER_BASE_NAMES.reduce<Record<HandlerBase, ReadonlySet<string>>>(
    (acc, base) => {
        acc[base] = new Set([BASE_TO_DECORATOR[base]]);
        return acc;
    },
    {} as Record<HandlerBase, ReadonlySet<string>>
);

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
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const bases = new Map<string, HandlerBase>();

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (isHandlerBase(imported)) bases.set(local, imported);
                });
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;

                let base = bases.get(node.superClass.name);
                if (base === undefined && node.id) {
                    const symbol = services.getSymbolAtLocation(node.id);
                    if (symbol) {
                        const classType = checker.getDeclaredTypeOfSymbol(symbol);
                        base = HANDLER_BASE_NAMES.find((name) => extendsSeedcordType(checker, classType, name));
                    }
                }
                if (base === undefined) return;
                // an abstract subclass becomes a base for later concrete handlers (same-file intermediate)
                if (node.abstract) {
                    if (node.id) bases.set(node.id.name, base);
                    return;
                }
                // only the decorator matching this handler's base registers it. a wrong-type route still fails
                if (hasDecoratorNamed(node, DECORATOR_SETS[base])) return;

                context.report({
                    node: node.id ?? node,
                    messageId: 'missingRoute',
                    data: { base, decorator: BASE_TO_DECORATOR[base] }
                });
            }
        };
    }
});
