import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { booleanLiteralValue, extendsDjsType } from '../../typeUtils';
import { chainRoot, collectChain, isChainTop, methodName } from '../../utils';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

const OPTION_BUILDERS = new Set(['SlashCommandStringOption', 'SlashCommandIntegerOption', 'SlashCommandNumberOption']);

// the last setAutocomplete call is the effective one. collectChain is outermost-first, so the first match is the last executed
function autocompleteOn(
    calls: TSESTree.CallExpression[],
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): boolean {
    const last = calls.find((call) => methodName(call) === 'setAutocomplete');
    const arg = last?.arguments[0];
    if (arg === undefined) return false;
    if (arg.type === AST_NODE_TYPES.Literal) return arg.value === true;
    // a const flag's boolean literal type is its value
    return booleanLiteralValue(checker, services.getTypeAtLocation(arg)) === true;
}

// addChoices appends literal choices, setChoices replaces them
function declaresChoices(calls: TSESTree.CallExpression[]): boolean {
    let has = false;
    // reversed to source order, so a later setChoices resets an earlier addChoices
    for (const call of [...calls].reverse()) {
        const name = methodName(call);
        if (name === 'addChoices') {
            if (call.arguments.some((arg) => arg.type !== AST_NODE_TYPES.SpreadElement)) has = true;
        } else if (name === 'setChoices') {
            has = call.arguments.some((arg) => {
                if (arg.type === AST_NODE_TYPES.SpreadElement) return false;
                if (arg.type === AST_NODE_TYPES.ArrayExpression) {
                    return arg.elements.some((el) => el !== null && el.type !== AST_NODE_TYPES.SpreadElement);
                }
                return true;
            });
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
                'A slash option cannot enable autocomplete and declare choices at once. Building that throws a RangeError.'
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
                if (autocompleteOn(calls, services, checker) && declaresChoices(calls)) {
                    context.report({ node, messageId: 'bothSet' });
                }
            }
        };
    }
});
