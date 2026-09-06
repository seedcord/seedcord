import {
    classInstanceType,
    createDecoratorMatcher,
    extendsSeedcordType,
    forEachSeedcordImport
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

const BASE_TO_DECORATOR = {
    SlashHandler: 'SlashRoute',
    ButtonHandler: 'ButtonRoute',
    ModalHandler: 'ModalRoute',
    StringMenuHandler: 'StringMenuRoute',
    UserMenuHandler: 'UserMenuRoute',
    RoleMenuHandler: 'RoleMenuRoute',
    ChannelMenuHandler: 'ChannelMenuRoute',
    MentionableMenuHandler: 'MentionableMenuRoute',
    UserContextMenuHandler: 'UserContextMenuRoute',
    MessageContextMenuHandler: 'MessageContextMenuRoute',
    AutocompleteHandler: 'AutocompleteRoute',
    // keep last. every per-kind menu base extends this one. the structural search takes the first match.
    SelectMenuHandler: 'StringMenuRoute'
} as const;

type HandlerBase = keyof typeof BASE_TO_DECORATOR;

const HANDLER_BASE_NAMES = Object.keys(BASE_TO_DECORATOR) as HandlerBase[];

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
                'This {{base}} has no @{{decorator}} decorator, so it never registers and its interactions fall through to the unhandled default.',
            sharedSelectBase:
                'SelectMenuHandler is the shared base and takes no route decorator. Extend the base for the kind you need, such as StringMenuHandler or UserMenuHandler.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const bases = new Map<string, HandlerBase>();
        const decorators = createDecoratorMatcher(services, checker, Object.values(BASE_TO_DECORATOR));

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (isHandlerBase(imported)) bases.set(local, imported);
                });
                decorators.collectImports(node);
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;

                let base = bases.get(node.superClass.name);
                if (base === undefined) {
                    const classType = classInstanceType(node, services, checker);
                    if (classType) {
                        base = HANDLER_BASE_NAMES.find((name) => extendsSeedcordType(checker, classType, name));
                    }
                }
                if (base === undefined) return;
                if (node.abstract) {
                    if (node.id) bases.set(node.id.name, base);
                    return;
                }
                if (base === 'SelectMenuHandler') {
                    context.report({ node: node.id ?? node, messageId: 'sharedSelectBase' });
                    return;
                }
                if (decorators.hasDecorator(node, BASE_TO_DECORATOR[base])) return;

                context.report({
                    node: node.id ?? node,
                    messageId: 'missingRoute',
                    data: { base, decorator: BASE_TO_DECORATOR[base] }
                });
            }
        };
    }
});
