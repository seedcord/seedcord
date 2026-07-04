import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { forEachSeedcordImport, hasDecoratorNamed } from '../../utils';

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
                forEachSeedcordImport(node, (imported, local) => {
                    if (MIDDLEWARE_BASES.has(imported)) bases.add(local);
                });
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;
                if (!bases.has(node.superClass.name)) return;
                // an abstract subclass becomes a base for later concrete middleware (same-file intermediate)
                if (node.abstract) {
                    if (node.id) bases.add(node.id.name);
                    return;
                }
                if (hasDecoratorNamed(node, MIDDLEWARE_DECORATOR)) return;

                context.report({ node: node.id ?? node, messageId: 'missingMiddleware' });
            }
        };
    }
});
