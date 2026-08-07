import {
    classInstanceType,
    createDecoratorMatcher,
    extendsSeedcordType,
    forEachSeedcordImport
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

const MIDDLEWARE_BASES = new Set(['InteractionMiddleware', 'EventMiddleware']);
const MIDDLEWARE_DECORATOR = 'Middleware';

export default createRule({
    name: 'middleware-missing-register-decorator',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require @Middleware on every concrete interaction or event middleware.'
        },
        messages: {
            missingMiddleware: 'This middleware has no @Middleware decorator, so it never runs on any request.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const bases = new Set<string>();
        const decorators = createDecoratorMatcher(services, checker, [MIDDLEWARE_DECORATOR]);

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (MIDDLEWARE_BASES.has(imported)) bases.add(local);
                });
                decorators.collectImports(node);
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;

                let isBase = bases.has(node.superClass.name);
                if (!isBase) {
                    const classType = classInstanceType(node, services, checker);
                    if (classType) isBase = extendsSeedcordType(checker, classType, MIDDLEWARE_BASES);
                }
                if (!isBase) return;
                if (node.abstract) {
                    if (node.id) bases.add(node.id.name);
                    return;
                }
                if (decorators.hasDecorator(node, MIDDLEWARE_DECORATOR)) return;

                context.report({ node: node.id ?? node, messageId: 'missingMiddleware' });
            }
        };
    }
});
