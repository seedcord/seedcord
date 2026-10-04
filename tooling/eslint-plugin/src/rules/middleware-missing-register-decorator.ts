import {
    classInstanceType,
    createDecoratorMatcher,
    extendsSeedcordType,
    forEachSeedcordImport
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '#src/createRule';

const BASE_TO_DECORATOR = {
    InteractionMiddleware: 'RegisterInteractionMiddleware',
    EventMiddleware: 'RegisterEventMiddleware'
} as const;

type MiddlewareBase = keyof typeof BASE_TO_DECORATOR;

const MIDDLEWARE_BASE_NAMES = Object.keys(BASE_TO_DECORATOR) as MiddlewareBase[];

function isMiddlewareBase(name: string): name is MiddlewareBase {
    return name in BASE_TO_DECORATOR;
}

export default createRule({
    name: 'middleware-missing-register-decorator',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require the matching register decorator on every concrete middleware.'
        },
        messages: {
            missingMiddleware: 'This {{base}} has no @{{decorator}} decorator, so it never runs.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const bases = new Map<string, MiddlewareBase>();
        const decorators = createDecoratorMatcher(services, checker, Object.values(BASE_TO_DECORATOR));

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (isMiddlewareBase(imported)) bases.set(local, imported);
                });
                decorators.collectImports(node);
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;

                let base = bases.get(node.superClass.name);
                if (base === undefined) {
                    const classType = classInstanceType(node, services, checker);
                    if (classType) {
                        base = MIDDLEWARE_BASE_NAMES.find((name) => extendsSeedcordType(checker, classType, name));
                    }
                }
                if (base === undefined) return;
                if (node.abstract) {
                    if (node.id) bases.set(node.id.name, base);
                    return;
                }
                if (decorators.hasDecorator(node, BASE_TO_DECORATOR[base])) return;

                context.report({
                    node: node.id ?? node,
                    messageId: 'missingMiddleware',
                    data: { base, decorator: BASE_TO_DECORATOR[base] }
                });
            }
        };
    }
});
