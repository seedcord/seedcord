import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsDjsType } from '../../typeUtils';
import { chainRoot, collectChain, isChainTop, methodName } from '../../utils';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';

// collectChain is outermost-first, so the first match is the last call executed, and that one wins
function lastCall(calls: TSESTree.CallExpression[], name: string): TSESTree.CallExpression | undefined {
    return calls.find((call) => methodName(call) === name);
}

function staticNumber(
    arg: TSESTree.CallExpressionArgument | undefined,
    services: ParserServicesWithTypeInformation
): number | undefined {
    if (arg === undefined || arg.type === AST_NODE_TYPES.SpreadElement) return undefined;
    if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'number') return arg.value;
    // a const bound resolves through its number-literal type
    const type = services.getTypeAtLocation(arg);
    return type.isNumberLiteral() ? type.value : undefined;
}

export default createRule({
    name: 'select-menu-min-exceeds-max',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow a select menu whose minimum selections exceed its maximum.'
        },
        messages: {
            minOverMax: 'setMinValues({{min}}) is greater than setMaxValues({{max}}). Discord rejects the select menu.'
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

                const calls = collectChain(node);
                // both setters must be on the chain before the type lookup is worth paying for
                const minCall = lastCall(calls, 'setMinValues');
                const maxCall = lastCall(calls, 'setMaxValues');
                if (minCall === undefined || maxCall === undefined) return;

                if (!extendsDjsType(checker, services.getTypeAtLocation(chainRoot(node)), 'BaseSelectMenuBuilder')) {
                    return;
                }

                const min = staticNumber(minCall.arguments[0], services);
                const max = staticNumber(maxCall.arguments[0], services);
                if (min === undefined || max === undefined || min <= max) return;

                // so the squiggle lands on the offending setter
                const target =
                    minCall.callee.type === AST_NODE_TYPES.MemberExpression ? minCall.callee.property : minCall;
                context.report({ node: target, messageId: 'minOverMax', data: { min, max } });
            }
        };
    }
});
