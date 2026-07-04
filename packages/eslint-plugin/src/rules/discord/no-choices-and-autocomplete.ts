import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { extendsDjsType } from '../../typeUtils';
import { chainRoot, collectChain, isChainTop, methodName } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

const OPTION_BUILDERS = new Set(['SlashCommandStringOption', 'SlashCommandIntegerOption', 'SlashCommandNumberOption']);

// the last setAutocomplete call decides. collectChain is outermost-first, so the first match is the last executed
function autocompleteOn(calls: TSESTree.CallExpression[]): boolean {
    const last = calls.find((call) => methodName(call) === 'setAutocomplete');
    const arg = last?.arguments[0];
    return arg?.type === AST_NODE_TYPES.Literal && arg.value === true;
}

// addChoices appends literal choices, setChoices replaces them. a spread or empty setChoices leaves none provable
function declaresChoices(calls: TSESTree.CallExpression[]): boolean {
    let has = false;
    for (const call of [...calls].reverse()) {
        const name = methodName(call);
        if (name === 'addChoices') {
            if (call.arguments.some((arg) => arg.type !== AST_NODE_TYPES.SpreadElement)) has = true;
        } else if (name === 'setChoices') {
            has = call.arguments.some((arg) => arg.type !== AST_NODE_TYPES.SpreadElement);
        }
    }
    return has;
}

export default createRule({
    name: 'no-choices-and-autocomplete',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow both autocomplete and choices on the same slash option.'
        },
        messages: {
            bothSet:
                'A slash option cannot enable autocomplete and declare choices at once, so building it throws a RangeError.'
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
                if (!extendsDjsType(checker, services.getTypeAtLocation(chainRoot(node)), OPTION_BUILDERS)) return;

                const calls = collectChain(node);
                if (autocompleteOn(calls) && declaresChoices(calls)) {
                    context.report({ node, messageId: 'bothSet' });
                }
            }
        };
    }
});
