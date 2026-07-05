import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import { SymbolFlags } from 'typescript';

import { hasV2Components } from '../../componentsV2';
import { createRule } from '../../createRule';
import { getProperty } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

// a message carries content through these fields or through builder components, never both
const CONTENT_FIELDS = ['content', 'embeds', 'poll', 'stickers', 'sticker_ids'];

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
                    return symbol !== undefined && (symbol.flags & SymbolFlags.Optional) === 0;
                });
                if (carries) return true;
            }
            return false;
        }

        function hasContentField(node: TSESTree.ObjectExpression): boolean {
            if (CONTENT_FIELDS.some((name) => getProperty(node, name) !== undefined)) return true;
            return spreadHasContent(node);
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
