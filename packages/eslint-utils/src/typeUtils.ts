import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { SymbolFlags, TypeFlags } from 'typescript';

import { constructorData, unwrapAssertions } from './utils';

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

function decoratorIdentifier(decorator: TSESTree.Decorator): TSESTree.Identifier | undefined {
    const expr = decorator.expression;
    if (expr.type === AST_NODE_TYPES.CallExpression && expr.callee.type === AST_NODE_TYPES.Identifier) {
        return expr.callee;
    }
    if (expr.type === AST_NODE_TYPES.Identifier) return expr;
    return undefined;
}

// matches class decorators to seedcord decorator names by import origin
export interface DecoratorMatcher {
    collectImports(node: TSESTree.ImportDeclaration): void;
    hasDecorator(node: TSESTree.ClassDeclaration, originalName: string): boolean;
}

export function createDecoratorMatcher(
    services: ParserServicesWithTypeInformation,
    checker: ts.TypeChecker,
    originalNames: readonly string[]
): DecoratorMatcher {
    const wanted = new Set(originalNames);
    const locals = new Map<string, Set<string>>();

    // a tsconfig-alias import is shaped like a scoped package, only the resolved declaration file tells the two apart
    function resolvesTo(id: TSESTree.Identifier, originalName: string): boolean {
        const symbol = checker.getSymbolAtLocation(services.esTreeNodeToTSNodeMap.get(id));
        if (!symbol) return false;
        const target = symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        if (target.getName() !== originalName) return false;
        const file = target.declarations?.[0]?.getSourceFile().fileName ?? '';
        if (!file.includes('node_modules')) return true;
        return /node_modules[\\/](@seedcord[\\/]|seedcord[\\/])/.test(file);
    }

    return {
        collectImports(node) {
            const source = node.source.value;
            if (typeof source !== 'string') return;
            if (source !== 'seedcord' && !source.startsWith('@seedcord/') && !source.startsWith('.')) return;
            for (const spec of node.specifiers) {
                if (spec.type !== AST_NODE_TYPES.ImportSpecifier) continue;
                if (spec.imported.type !== AST_NODE_TYPES.Identifier) continue;
                if (!wanted.has(spec.imported.name)) continue;
                let set = locals.get(spec.imported.name);
                if (!set) {
                    set = new Set();
                    locals.set(spec.imported.name, set);
                }
                set.add(spec.local.name);
            }
        },
        hasDecorator(node, originalName) {
            return node.decorators.some((decorator) => {
                const id = decoratorIdentifier(decorator);
                if (!id) return false;
                if (locals.get(originalName)?.has(id.name)) return true;
                return resolvesTo(id, originalName);
            });
        }
    };
}

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
