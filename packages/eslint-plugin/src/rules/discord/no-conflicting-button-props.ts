import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsDjsType } from '../../typeUtils';
import { chainRoot, collectChain, isChainTop, methodName } from '../../utils';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';

function setsLinkStyle(call: TSESTree.CallExpression, services: ParserServicesWithTypeInformation): boolean {
    if (methodName(call) !== 'setStyle') return false;
    const arg = call.arguments[0];
    if (arg === undefined) return false;
    if (arg.type === AST_NODE_TYPES.Literal && arg.value === 5) return true;
    if (
        arg.type === AST_NODE_TYPES.MemberExpression &&
        arg.object.type === AST_NODE_TYPES.Identifier &&
        arg.object.name === 'ButtonStyle' &&
        arg.property.type === AST_NODE_TYPES.Identifier &&
        arg.property.name === 'Link'
    )
        return true;
    // type-aware fallback: an identifier or expression whose type resolves to the numeric literal 5
    const type = services.getTypeAtLocation(arg);
    return type.isNumberLiteral() && type.value === 5;
}

export default createRule({
    name: 'no-conflicting-button-props',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow conflicting props on a button builder.'
        },
        messages: {
            idAndUrl: 'A button cannot set both a customId and a url.',
            linkWithCustomId: 'A link button uses a url and cannot have a customId.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;
                if (!extendsDjsType(checker, services.getTypeAtLocation(chainRoot(node)), 'ButtonBuilder')) return;

                const calls = collectChain(node);
                const hasCustomId = calls.some((call) => methodName(call) === 'setCustomId');
                const hasUrl = calls.some((call) => methodName(call) === 'setURL');

                if (hasCustomId && hasUrl) {
                    context.report({ node, messageId: 'idAndUrl' });
                } else if (hasCustomId && calls.some((call) => setsLinkStyle(call, services))) {
                    context.report({ node, messageId: 'linkWithCustomId' });
                }
            }
        };
    }
});
