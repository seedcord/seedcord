import { hasV2Components, isFromDiscordJs, propertyKeyIs, resolveConstInit } from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

// discord's MessageFlags.IsComponentsV2 bit
const IS_COMPONENTS_V2 = 32_768;

type FlagState = 'present' | 'absent' | 'unknown';

// the runtime value is any one member
function combine(states: FlagState[]): FlagState {
    const [first] = states;
    if (first === undefined) return 'unknown';
    return states.every((state) => state === first) ? first : 'unknown';
}

function bitState(value: number): FlagState {
    return (value & IS_COMPONENTS_V2) === 0 ? 'absent' : 'present';
}

function flagTypeState(type: ts.Type | undefined): FlagState {
    if (type === undefined) return 'unknown';
    if (type.isUnion()) return combine(type.types.map(flagTypeState));
    if (type.isNumberLiteral()) return bitState(type.value);
    if (type.isStringLiteral()) {
        if (type.value === 'IsComponentsV2') return 'present';
        // the `${bigint}` resolvable arm, e.g. flags: '32768'
        if (/^\d+$/u.test(type.value)) return bitState(Number(type.value));
        return 'absent';
    }
    const element = type.getNumberIndexType();
    if (element !== undefined) return flagTypeState(element);
    return 'unknown';
}

function applyBitwise(operator: string, left: number, right: number): number | undefined {
    switch (operator) {
        case '|': {
            return left | right;
        }
        case '&': {
            return left & right;
        }
        case '^': {
            return left ^ right;
        }
        case '<<': {
            return left << right;
        }
        case '>>': {
            return left >> right;
        }
        case '>>>': {
            return left >>> right;
        }
        default: {
            return undefined;
        }
    }
}

// the checker widens a bitwise expression to `number`, so fold it from the operands it still
// resolves as literals (a numeric literal or an enum member)
function foldToNumber(node: TSESTree.Node, services: ParserServicesWithTypeInformation): number | undefined {
    switch (node.type) {
        case AST_NODE_TYPES.Literal: {
            return typeof node.value === 'number' ? node.value : undefined;
        }
        case AST_NODE_TYPES.TSAsExpression: {
            return foldToNumber(node.expression, services);
        }
        case AST_NODE_TYPES.UnaryExpression: {
            const value = foldToNumber(node.argument, services);
            if (value === undefined) return undefined;
            if (node.operator === '-') return -value;
            if (node.operator === '~') return ~value;
            if (node.operator === '+') return value;
            return undefined;
        }
        case AST_NODE_TYPES.BinaryExpression: {
            const left = foldToNumber(node.left, services);
            const right = foldToNumber(node.right, services);
            if (left === undefined || right === undefined) return undefined;
            return applyBitwise(node.operator, left, right);
        }
        case AST_NODE_TYPES.Identifier:
        case AST_NODE_TYPES.MemberExpression: {
            const type = services.getTypeAtLocation(node);
            return type.isNumberLiteral() ? type.value : undefined;
        }
        default: {
            return undefined;
        }
    }
}

function elementState(node: TSESTree.Node, services: ParserServicesWithTypeInformation): FlagState {
    const folded = foldToNumber(node, services);
    if (folded !== undefined) return bitState(folded);
    return flagTypeState(services.getTypeAtLocation(node));
}

function flagValueState(value: TSESTree.Node, services: ParserServicesWithTypeInformation): FlagState {
    if (value.type === AST_NODE_TYPES.ArrayExpression) {
        const states = new Set(
            value.elements.map((element): FlagState => {
                if (element === null) return 'absent';
                if (element.type === AST_NODE_TYPES.SpreadElement) {
                    return flagTypeState(services.getTypeAtLocation(element.argument).getNumberIndexType());
                }
                return elementState(element, services);
            })
        );
        if (states.has('present')) return 'present';
        return states.has('unknown') ? 'unknown' : 'absent';
    }
    return elementState(value, services);
}

// a later flags key or spread overwrites an earlier one
function flagState(
    node: TSESTree.ObjectExpression,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): FlagState {
    let state: FlagState = 'absent';
    for (const prop of node.properties) {
        if (prop.type === AST_NODE_TYPES.Property && propertyKeyIs(prop, 'flags')) {
            state = flagValueState(prop.value, services);
        } else if (prop.type === AST_NODE_TYPES.SpreadElement) {
            const symbol = services.getTypeAtLocation(prop.argument).getProperty('flags');
            if (symbol !== undefined) state = flagTypeState(checker.getTypeOfSymbol(symbol));
        }
    }
    return state;
}

function isMessageOptionsType(type: ts.Type): boolean {
    if (type.isUnion()) return type.types.some(isMessageOptionsType);
    const components = type.getProperty('components');
    const flags = type.getProperty('flags');
    return components !== undefined && flags !== undefined && isFromDiscordJs(components) && isFromDiscordJs(flags);
}

export default createRule({
    name: 'require-components-v2-flag',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require the IsComponentsV2 flag on a message that uses v2 builder components.'
        },
        messages: {
            missingFlag:
                'A message using v2 builder components must set flags: MessageFlags.IsComponentsV2. Discord rejects the payload otherwise.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const reportedInits = new Set<TSESTree.ObjectExpression>();

        function payloadViolates(node: TSESTree.ObjectExpression): boolean {
            return hasV2Components(node, services, checker) && flagState(node, services, checker) === 'absent';
        }

        function contextualType(node: TSESTree.Identifier | TSESTree.ObjectExpression): ts.Type | undefined {
            // justified: the node map widens an identifier to declaration kinds it cannot be in value position
            return checker.getContextualType(services.esTreeNodeToTSNodeMap.get(node) as ts.Expression);
        }

        return {
            ObjectExpression(node) {
                if (!payloadViolates(node)) return;
                const contextual = contextualType(node);
                if (contextual === undefined || !isMessageOptionsType(contextual)) return;

                context.report({ node, messageId: 'missingFlag' });
            },
            // an unannotated payload has no contextual type until the call site
            CallExpression(node) {
                for (const arg of node.arguments) {
                    if (arg.type !== AST_NODE_TYPES.Identifier) continue;
                    const init = resolveConstInit(context.sourceCode, arg);
                    if (init?.type !== AST_NODE_TYPES.ObjectExpression) continue;
                    // an annotated declaration is already reported at the object literal
                    if (contextualType(init) !== undefined) continue;
                    if (reportedInits.has(init)) continue;
                    const contextual = contextualType(arg);
                    if (contextual === undefined || !isMessageOptionsType(contextual)) continue;
                    if (payloadViolates(init)) {
                        reportedInits.add(init);
                        context.report({ node: init, messageId: 'missingFlag' });
                    }
                }
            }
        };
    }
});
