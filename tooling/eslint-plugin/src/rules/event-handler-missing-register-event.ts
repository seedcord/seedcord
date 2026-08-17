import {
    classInstanceType,
    createDecoratorMatcher,
    extendsSeedcordType,
    forEachSeedcordImport
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

const REGISTER_EVENT = 'RegisterEvent';
const EVENT_HANDLER = 'EventHandler';

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
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const bases = new Set<string>();
        const decorators = createDecoratorMatcher(services, checker, [REGISTER_EVENT]);

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (imported === EVENT_HANDLER) bases.add(local);
                });
                decorators.collectImports(node);
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;

                let isBase = bases.has(node.superClass.name);
                if (!isBase) {
                    const classType = classInstanceType(node, services, checker);
                    if (classType) isBase = extendsSeedcordType(checker, classType, EVENT_HANDLER);
                }
                if (!isBase) return;
                if (node.abstract) {
                    if (node.id) bases.add(node.id.name);
                    return;
                }
                if (decorators.hasDecorator(node, REGISTER_EVENT)) return;

                context.report({ node: node.id ?? node, messageId: 'missingRegister' });
            }
        };
    }
});
