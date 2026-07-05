import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import { SymbolFlags, TypeFlags } from 'typescript';

import { hasV2Components } from '../../componentsV2';
import { createRule } from '../../createRule';
import { getProperty } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

// a message carries content through these fields or through builder components, never both
const CONTENT_FIELDS = ['content', 'embeds', 'poll', 'stickers', 'sticker_ids'];

// JSON serialization drops an undefined property, so the wire payload carries no such field
function isDefinitelyUndefined(type: ts.Type): boolean {
    return (type.flags & TypeFlags.Undefined) !== 0;
}

export default createRule({
    name: 'no-mixed-message-format',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow a message that mixes builder components with content, embeds, poll, or stickers.'
        },
        messages: {
            mixedFormat:
                'A message cannot mix builder components with content, embeds, poll, or stickers. Discord rejects the payload.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        // the content side can also arrive through a spread of another object, so read the spread's type.
        // an optional field may be absent at runtime. only a required one is certainly set
        function spreadHasContent(node: TSESTree.ObjectExpression): boolean {
            for (const prop of node.properties) {
                if (prop.type !== AST_NODE_TYPES.SpreadElement) continue;
                const type = services.getTypeAtLocation(prop.argument);
                const carries = CONTENT_FIELDS.some((name) => {
                    const symbol = type.getProperty(name);
                    if (symbol === undefined || (symbol.flags & SymbolFlags.Optional) !== 0) return false;
                    return !isDefinitelyUndefined(checker.getTypeOfSymbol(symbol));
                });
                if (carries) return true;
            }
            return false;
        }

        function hasContentField(node: TSESTree.ObjectExpression): boolean {
            const direct = CONTENT_FIELDS.some((name) => {
                const prop = getProperty(node, name);
                return prop !== undefined && !isDefinitelyUndefined(services.getTypeAtLocation(prop.value));
            });
            return direct || spreadHasContent(node);
        }

        return {
            ObjectExpression(node) {
                if (hasV2Components(node, services, checker) && hasContentField(node)) {
                    context.report({ node, messageId: 'mixedFormat' });
                }
            }
        };
    }
});
