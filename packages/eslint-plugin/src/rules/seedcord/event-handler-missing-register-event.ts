import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { forEachSeedcordImport, hasDecoratorNamed } from '../../utils';

const REGISTER_EVENT = new Set(['RegisterEvent']);

export default createRule({
    name: 'event-handler-missing-register-event',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require @RegisterEvent on every concrete event handler.'
        },
        messages: {
            missingRegister:
                'This EventHandler has no @RegisterEvent decorator, so it never registers and never runs when the event fires.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const bases = new Set<string>();

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (imported === 'EventHandler') bases.add(local);
                });
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;
                if (!bases.has(node.superClass.name)) return;
                // an abstract subclass becomes a base for later concrete handlers (same-file intermediate)
                if (node.abstract) {
                    if (node.id) bases.add(node.id.name);
                    return;
                }
                if (hasDecoratorNamed(node, REGISTER_EVENT)) return;

                context.report({ node: node.id ?? node, messageId: 'missingRegister' });
            }
        };
    }
});
