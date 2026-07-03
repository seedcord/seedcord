import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { hasDecoratorNamed, isSeedcordSource } from '../../utils';

const MIDDLEWARE_BASES = new Set(['InteractionMiddleware', 'EventMiddleware']);
const MIDDLEWARE_DECORATOR = new Set(['Middleware']);

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
        const bases = new Set<string>();

        return {
            ImportDeclaration(node) {
                if (typeof node.source.value !== 'string' || !isSeedcordSource(node.source.value)) return;
                for (const spec of node.specifiers) {
                    if (spec.type !== AST_NODE_TYPES.ImportSpecifier) continue;
                    if (spec.imported.type !== AST_NODE_TYPES.Identifier) continue;
                    if (MIDDLEWARE_BASES.has(spec.imported.name)) bases.add(spec.local.name);
                }
            },
            ClassDeclaration(node) {
                if (node.abstract) return;
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;
                if (!bases.has(node.superClass.name)) return;
                if (hasDecoratorNamed(node, MIDDLEWARE_DECORATOR)) return;

                context.report({ node: node.id ?? node, messageId: 'missingMiddleware' });
            }
        };
    }
});
