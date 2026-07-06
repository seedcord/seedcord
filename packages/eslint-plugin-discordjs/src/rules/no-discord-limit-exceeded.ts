import { extendsDjsType, chainRoot, collectChain, isChainTop, methodName } from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

interface Limit {
    builders: ReadonlySet<string>;
    addMethod: string;
    setMethod: string;
    cap: number;
    detail: string;
}

const LIMITS: readonly Limit[] = [
    {
        builders: new Set(['ActionRowBuilder']),
        addMethod: 'addComponents',
        setMethod: 'setComponents',
        cap: 5,
        detail: 'An action row holds at most 5 components'
    },
    {
        builders: new Set(['StringSelectMenuBuilder']),
        addMethod: 'addOptions',
        setMethod: 'setOptions',
        cap: 25,
        detail: 'A select menu holds at most 25 options'
    },
    {
        builders: new Set(['EmbedBuilder']),
        addMethod: 'addFields',
        setMethod: 'setFields',
        cap: 25,
        detail: 'An embed holds at most 25 fields'
    },
    {
        builders: new Set(['SlashCommandStringOption', 'SlashCommandIntegerOption', 'SlashCommandNumberOption']),
        addMethod: 'addChoices',
        setMethod: 'setChoices',
        cap: 25,
        detail: 'A slash option holds at most 25 choices'
    }
];

// a fixed-arity tuple type (an as-const array) has a statically known length
function tupleLength(type: ts.Type, checker: ts.TypeChecker): number | undefined {
    if (!checker.isTupleType(type)) return undefined;
    // justified: isTupleType narrows to a reference whose target is the tuple shape
    const reference = type as ts.TypeReference;
    const target = reference.target as ts.TupleType;
    const length = checker.getTypeArguments(reference).length;
    // an optional or rest element raises the argument count past minLength, so the arity is uncertain
    return target.minLength === length ? length : undefined;
}

function spreadCount(
    spread: TSESTree.SpreadElement,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): number | undefined {
    return tupleLength(services.getTypeAtLocation(spread.argument), checker);
}

// the array length when every element is countable, spreads resolve through tuple arity
function arrayLength(
    array: TSESTree.ArrayExpression,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): number | undefined {
    let count = 0;
    for (const element of array.elements) {
        if (element?.type === AST_NODE_TYPES.SpreadElement) {
            const arity = spreadCount(element, services, checker);
            if (arity === undefined) return undefined;
            count += arity;
        } else {
            count += 1;
        }
    }
    return count;
}

function countStaticItems(
    calls: TSESTree.CallExpression[],
    limit: Limit,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): number | undefined {
    let count = 0;
    let matched = false;
    // reversed to source order, so a later setMethod wins over earlier adds
    for (const call of [...calls].reverse()) {
        const name = methodName(call);
        if (name === limit.addMethod) {
            matched = true;
            for (const arg of call.arguments) {
                if (arg.type === AST_NODE_TYPES.SpreadElement) {
                    const arity = spreadCount(arg, services, checker);
                    if (arity === undefined) return undefined;
                    count += arity;
                } else {
                    count += 1;
                }
            }
        } else if (name === limit.setMethod) {
            matched = true;
            const arg = call.arguments[0];
            const length =
                arg?.type === AST_NODE_TYPES.ArrayExpression
                    ? arrayLength(arg, services, checker)
                    : arg !== undefined && arg.type !== AST_NODE_TYPES.SpreadElement
                      ? tupleLength(services.getTypeAtLocation(arg), checker)
                      : undefined;
            if (length === undefined) return undefined;
            count = length; // setMethod replaces, so this resets the count
        }
    }
    return matched ? count : undefined;
}

export default createRule({
    name: 'no-discord-limit-exceeded',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow exceeding a Discord builder limit with a statically-known number of items.'
        },
        messages: {
            tooMany: '{{detail}}. This chain declares {{count}}.'
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
                const methods = new Set(calls.map((call) => methodName(call)));
                // skip the type lookup when no capped method is on the chain
                if (!LIMITS.some((limit) => methods.has(limit.addMethod) || methods.has(limit.setMethod))) return;

                const type = services.getTypeAtLocation(chainRoot(node));
                const limit = LIMITS.find((entry) => extendsDjsType(checker, type, entry.builders));
                if (!limit) return;

                const count = countStaticItems(calls, limit, services, checker);
                if (count !== undefined && count > limit.cap) {
                    context.report({ node, messageId: 'tooMany', data: { detail: limit.detail, count } });
                }
            }
        };
    }
});
