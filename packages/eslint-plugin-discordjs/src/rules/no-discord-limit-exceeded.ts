import {
    constructorData,
    enclosingChainTop,
    extendsDjsType,
    chainRoot,
    collectChain,
    getProperty,
    isChainTop,
    methodName,
    trustedConstructorData
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

interface Limit {
    builders: ReadonlySet<string>;
    addMethod: string;
    setMethod: string;
    dataKey?: string;
    cap: number;
    detail: string;
}

const LIMITS: readonly Limit[] = [
    {
        builders: new Set(['ActionRowBuilder']),
        addMethod: 'addComponents',
        setMethod: 'setComponents',
        dataKey: 'components',
        cap: 5,
        detail: 'An action row holds at most 5 components'
    },
    {
        builders: new Set(['StringSelectMenuBuilder']),
        addMethod: 'addOptions',
        setMethod: 'setOptions',
        dataKey: 'options',
        cap: 25,
        detail: 'A select menu holds at most 25 options'
    },
    {
        builders: new Set(['EmbedBuilder']),
        addMethod: 'addFields',
        setMethod: 'setFields',
        dataKey: 'fields',
        cap: 25,
        detail: 'An embed holds at most 25 fields'
    },
    // the slash option builders take no constructor data
    {
        builders: new Set(['SlashCommandStringOption', 'SlashCommandIntegerOption', 'SlashCommandNumberOption']),
        addMethod: 'addChoices',
        setMethod: 'setChoices',
        cap: 25,
        detail: 'A slash option holds at most 25 choices'
    }
];

function tupleLength(type: ts.Type, checker: ts.TypeChecker): number | undefined {
    if (!checker.isTupleType(type)) return undefined;
    // justified: isTupleType narrows to a reference whose target is the tuple shape
    const reference = type as ts.TypeReference;
    const target = reference.target as ts.TupleType;
    const length = checker.getTypeArguments(reference).length;
    // an optional or rest element raises the argument count past minLength
    return target.minLength === length ? length : undefined;
}

function spreadCount(
    spread: TSESTree.SpreadElement,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): number | undefined {
    return tupleLength(services.getTypeAtLocation(spread.argument), checker);
}

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

// discord.js normalizeArray reads a sole leading array argument (or array-typed variable) as the
// whole list and drops the remaining arguments
function callItems(
    call: TSESTree.CallExpression,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): number | undefined {
    const first = call.arguments[0];
    if (first === undefined) return 0;
    if (first.type === AST_NODE_TYPES.ArrayExpression) return arrayLength(first, services, checker);
    if (first.type !== AST_NODE_TYPES.SpreadElement) {
        const type = services.getTypeAtLocation(first);
        if (checker.isArrayLikeType(type)) return tupleLength(type, checker);
    }
    let count = 0;
    for (const arg of call.arguments) {
        if (arg.type === AST_NODE_TYPES.SpreadElement) {
            const arity = spreadCount(arg, services, checker);
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
    data: TSESTree.ObjectExpression | undefined,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): number | undefined {
    let count = 0;
    let matched = false;

    const seed = data !== undefined && limit.dataKey !== undefined ? getProperty(data, limit.dataKey) : undefined;
    if (seed !== undefined) {
        const length =
            seed.value.type === AST_NODE_TYPES.ArrayExpression
                ? arrayLength(seed.value, services, checker)
                : tupleLength(services.getTypeAtLocation(seed.value), checker);
        if (length === undefined) return undefined;
        count = length;
        matched = true;
    }

    // a later setMethod wins over earlier adds
    for (const call of [...calls].reverse()) {
        const name = methodName(call);
        if (name !== limit.addMethod && name !== limit.setMethod) continue;
        matched = true;
        const items = callItems(call, services, checker);
        if (items === undefined) return undefined;
        // the setMethod replaces the list
        count = name === limit.addMethod ? count + items : items;
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
            tooMany: '{{detail}}. This builder declares {{count}}.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        function check(anchor: TSESTree.Node, calls: TSESTree.CallExpression[], root: TSESTree.Node): void {
            const rawData = constructorData(root);
            const methods = new Set(calls.map((call) => methodName(call)));
            // cheap prefilter, the type lookup below costs the most
            const relevant = LIMITS.some(
                (limit) =>
                    methods.has(limit.addMethod) ||
                    methods.has(limit.setMethod) ||
                    (rawData !== undefined &&
                        limit.dataKey !== undefined &&
                        getProperty(rawData, limit.dataKey) !== undefined)
            );
            if (!relevant) return;

            const rootType = services.getTypeAtLocation(root);
            const limit = LIMITS.find((entry) => extendsDjsType(checker, rootType, entry.builders));
            if (!limit) return;

            const count = countStaticItems(calls, limit, trustedConstructorData(root, rootType), services, checker);
            if (count !== undefined && count > limit.cap) {
                context.report({ node: anchor, messageId: 'tooMany', data: { detail: limit.detail, count } });
            }
        }

        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;
                check(node, collectChain(node), chainRoot(node));
            },
            NewExpression(node) {
                // a chained root gets checked by the CallExpression visit above
                if (enclosingChainTop(node) !== node) return;
                check(node, [], node);
            }
        };
    }
});
