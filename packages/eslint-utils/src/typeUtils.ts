import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { TypeFlags } from 'typescript';

import { constructorData, unwrapAssertions } from './utils';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

// the symbol is declared inside the discord.js or @discordjs packages, so a same-named local class is excluded
export function isFromDiscordJs(symbol: ts.Symbol | undefined): boolean {
    const file = symbol?.declarations?.[0]?.getSourceFile().fileName;
    return file !== undefined && (file.includes('/discord.js/') || file.includes('/@discordjs/'));
}

// discord.js interactions are generic (ChatInputCommandInteraction<Cached>), so their base chain is only
// reachable through the target.
function asClassOrInterface(type: ts.Type): ts.InterfaceType | undefined {
    if (type.isClassOrInterface()) return type;
    // justified: the checker types .target as an always-present GenericType, but it is undefined on a
    // non-reference type at runtime.
    const target = (type as ts.TypeReference).target as ts.Type | undefined;
    if (target !== undefined && target !== type && target.isClassOrInterface()) return target;
    return undefined;
}

function walkBaseChain(checker: ts.TypeChecker, type: ts.Type, match: (symbol: ts.Symbol) => boolean): boolean {
    const seen = new Set<ts.Type>();
    const stack: ts.Type[] = [type];

    while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined || seen.has(current)) continue;
        seen.add(current);

        if (current.isUnionOrIntersection()) {
            stack.push(...current.types);
            continue;
        }

        const symbol = current.getSymbol();
        if (symbol !== undefined && match(symbol)) return true;

        const iface = asClassOrInterface(current);
        if (iface !== undefined) stack.push(...checker.getBaseTypes(iface));
    }

    return false;
}

export function extendsDjsType(checker: ts.TypeChecker, type: ts.Type, names: string | ReadonlySet<string>): boolean {
    const wanted = typeof names === 'string' ? new Set([names]) : names;
    return walkBaseChain(checker, type, (symbol) => wanted.has(symbol.getName()) && isFromDiscordJs(symbol));
}

// a user subclass constructor may repurpose the data argument, so it only counts on
// discord.js's own classes
export function trustedConstructorData(root: TSESTree.Node, rootType: ts.Type): TSESTree.ObjectExpression | undefined {
    const data = constructorData(root);
    return data !== undefined && isFromDiscordJs(rootType.getSymbol()) ? data : undefined;
}

export function staticNumber(
    node: TSESTree.CallExpressionArgument | TSESTree.Property['value'] | undefined,
    services: ParserServicesWithTypeInformation
): number | undefined {
    if (
        node === undefined ||
        node.type === AST_NODE_TYPES.SpreadElement ||
        node.type === AST_NODE_TYPES.AssignmentPattern ||
        node.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression
    ) {
        return undefined;
    }
    // a cast only changes the checker's view, the literal behind it is the runtime value
    const target = unwrapAssertions(node);
    if (target.type === AST_NODE_TYPES.Literal && typeof target.value === 'number') return target.value;
    // a const bound resolves through its number-literal type
    const type = services.getTypeAtLocation(target);
    return type.isNumberLiteral() ? type.value : undefined;
}

// a boolean literal's value is only reachable through its printed name
export function booleanLiteralValue(checker: ts.TypeChecker, type: ts.Type): boolean | undefined {
    if ((type.flags & TypeFlags.BooleanLiteral) === 0) return undefined;
    return checker.typeToString(type) === 'true';
}

// an anonymous default export has no id, so its instance type comes off the construct signature
export function classInstanceType(
    node: TSESTree.ClassDeclaration,
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker
): ts.Type | undefined {
    if (node.id) {
        const symbol = services.getSymbolAtLocation(node.id);
        return symbol === undefined ? undefined : checker.getDeclaredTypeOfSymbol(symbol);
    }
    const type = services.getTypeAtLocation(node);
    return type.getConstructSignatures()[0]?.getReturnType() ?? type;
}

// match by name only. a path-origin guard is ambiguous because "seedcord" appears in the plugin's own source paths
export function extendsSeedcordType(
    checker: ts.TypeChecker,
    type: ts.Type,
    names: string | ReadonlySet<string>
): boolean {
    const wanted = typeof names === 'string' ? new Set([names]) : names;
    return walkBaseChain(checker, type, (symbol) => wanted.has(symbol.getName()));
}
