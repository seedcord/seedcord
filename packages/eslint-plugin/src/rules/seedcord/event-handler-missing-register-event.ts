import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { hasDecoratorNamed, isSeedcordSource } from '../../utils';

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
                if (typeof node.source.value !== 'string' || !isSeedcordSource(node.source.value)) return;
                for (const spec of node.specifiers) {
                    if (spec.type !== AST_NODE_TYPES.ImportSpecifier) continue;
                    if (spec.imported.type !== AST_NODE_TYPES.Identifier) continue;
                    if (spec.imported.name === 'EventHandler') bases.add(spec.local.name);
                }
            },
            ClassDeclaration(node) {
                if (node.abstract) return;
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;
                if (!bases.has(node.superClass.name)) return;
                if (hasDecoratorNamed(node, REGISTER_EVENT)) return;

                context.report({ node: node.id ?? node, messageId: 'missingRegister' });
            }
        };
    }
});
