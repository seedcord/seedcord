import {
    calleeProperty,
    constructorData,
    enclosingChainTop,
    extendsDjsType,
    chainRoot,
    collectChain,
    getProperty,
    isChainTop,
    lastCall,
    staticNumber,
    trustedConstructorData
} from '@seedcord/eslint-utils';
import { ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

interface Bound {
    source: TSESTree.CallExpressionArgument | TSESTree.Property['value'] | undefined;
    site: TSESTree.Node;
}

// discord.js also accepts the camelCase key and snake_cases it at construction
function boundOf(
    calls: TSESTree.CallExpression[],
    data: TSESTree.ObjectExpression | undefined,
    method: string,
    key: string,
    camelKey: string
): Bound | undefined {
    const call = lastCall(calls, method);
    if (call !== undefined) return { source: call.arguments[0], site: calleeProperty(call) };
    const prop = data === undefined ? undefined : (getProperty(data, key) ?? getProperty(data, camelKey));
    if (prop !== undefined) return { source: prop.value, site: prop };
    return undefined;
}

export default createRule({
    name: 'select-menu-min-exceeds-max',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow a select menu whose minimum selections exceed its maximum.'
        },
        messages: {
            minOverMax:
                'A minimum of {{min}} selections exceeds the maximum of {{max}}. Discord rejects the select menu.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        function check(calls: TSESTree.CallExpression[], root: TSESTree.Node): void {
            const rawData = constructorData(root);
            if (boundOf(calls, rawData, 'setMinValues', 'min_values', 'minValues') === undefined) return;
            if (boundOf(calls, rawData, 'setMaxValues', 'max_values', 'maxValues') === undefined) return;

            const rootType = services.getTypeAtLocation(root);
            if (!extendsDjsType(checker, rootType, 'BaseSelectMenuBuilder')) return;

            const data = trustedConstructorData(root, rootType);
            const min = boundOf(calls, data, 'setMinValues', 'min_values', 'minValues');
            const max = boundOf(calls, data, 'setMaxValues', 'max_values', 'maxValues');
            if (min === undefined || max === undefined) return;

            const minValue = staticNumber(min.source, services);
            const maxValue = staticNumber(max.source, services);
            if (minValue === undefined || maxValue === undefined || minValue <= maxValue) return;

            // so the squiggle lands on the offending bound
            context.report({ node: min.site, messageId: 'minOverMax', data: { min: minValue, max: maxValue } });
        }

        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;
                check(collectChain(node), chainRoot(node));
            },
            NewExpression(node) {
                // a chained root is anchored by its chain-top CallExpression visit instead
                if (enclosingChainTop(node) !== node) return;
                check([], node);
            }
        };
    }
});
