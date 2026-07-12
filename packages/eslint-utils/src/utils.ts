import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

function isSeedcordSource(source: string): boolean {
    return source === 'seedcord' || source.startsWith('@seedcord/');
}

export function forEachSeedcordImport(
    node: TSESTree.ImportDeclaration,
    fn: (imported: string, local: string) => void
): void {
    if (typeof node.source.value !== 'string' || !isSeedcordSource(node.source.value)) return;
    for (const spec of node.specifiers) {
        if (spec.type !== AST_NODE_TYPES.ImportSpecifier) continue;
        if (spec.imported.type !== AST_NODE_TYPES.Identifier) continue;
        fn(spec.imported.name, spec.local.name);
    }
}

export function methodName(call: TSESTree.CallExpression): string | undefined {
    const { callee } = call;
    if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return undefined;
    if (callee.property.type !== AST_NODE_TYPES.Identifier) return undefined;
    return callee.property.name;
}

// the outermost call of a fluent chain
export function isChainTop(node: TSESTree.CallExpression): boolean {
    const { parent } = node;
    return parent.type !== AST_NODE_TYPES.MemberExpression || parent.object !== node;
}

// every `.method()` call in a fluent chain, from the outermost down
export function collectChain(top: TSESTree.CallExpression): TSESTree.CallExpression[] {
    const calls: TSESTree.CallExpression[] = [];
    let current: TSESTree.Node = top;
    while (current.type === AST_NODE_TYPES.CallExpression && current.callee.type === AST_NODE_TYPES.MemberExpression) {
        calls.push(current);
        current = current.callee.object;
    }
    return calls;
}

// the value a chain is built on, e.g. the `new ButtonBuilder()` a chain of setters runs against
export function chainRoot(top: TSESTree.CallExpression): TSESTree.Node {
    let current: TSESTree.Node = top;
    while (current.type === AST_NODE_TYPES.CallExpression && current.callee.type === AST_NODE_TYPES.MemberExpression) {
        current = current.callee.object;
    }
    return current;
}

// the outermost call of the fluent chain built on this expression, or the expression itself when unchained
export function enclosingChainTop<Node extends TSESTree.Node>(node: Node): Node | TSESTree.CallExpression {
    let current: Node | TSESTree.CallExpression = node;
    while (
        current.parent?.type === AST_NODE_TYPES.MemberExpression &&
        current.parent.object === current &&
        current.parent.parent.type === AST_NODE_TYPES.CallExpression &&
        current.parent.parent.callee === current.parent
    ) {
        current = current.parent.parent;
    }
    return current;
}

// collectChain is outermost-first, so the first match is the last call executed, and that one wins
export function lastCall(calls: TSESTree.CallExpression[], name: string): TSESTree.CallExpression | undefined {
    return calls.find((call) => methodName(call) === name);
}

// the property token of a member call, the natural report target for an offending setter
export function calleeProperty(call: TSESTree.CallExpression): TSESTree.Node {
    return call.callee.type === AST_NODE_TYPES.MemberExpression ? call.callee.property : call;
}

// a later reassignment means the initializer is not the value that reaches the use site
export function resolveConstInit(
    sourceCode: TSESLint.SourceCode,
    identifier: TSESTree.Identifier
): TSESTree.Expression | undefined {
    const variable = sourceCode.getScope(identifier).references.find((ref) => ref.identifier === identifier)?.resolved;
    const definition = variable?.defs[0];
    if (definition?.node.type !== AST_NODE_TYPES.VariableDeclarator) return undefined;
    if (variable?.references.some((ref) => ref.isWrite() && !ref.init)) return undefined;
    return definition.node.init ?? undefined;
}

export function propertyKeyIs(prop: TSESTree.Property, name: string): boolean {
    if (prop.computed) return false;
    const { key } = prop;
    if (key.type === AST_NODE_TYPES.Identifier) return key.name === name;
    // a non-computed, non-identifier key is a string or number literal
    return key.value === name;
}

export function getProperty(node: TSESTree.ObjectExpression, name: string): TSESTree.Property | undefined {
    return node.properties.find(
        (prop): prop is TSESTree.Property => prop.type === AST_NODE_TYPES.Property && propertyKeyIs(prop, name)
    );
}

// the data object literal behind a builder chain's `new X({ ... })` root
export function constructorData(root: TSESTree.Node): TSESTree.ObjectExpression | undefined {
    if (root.type !== AST_NODE_TYPES.NewExpression) return undefined;
    const arg = root.arguments[0];
    if (arg === undefined || arg.type === AST_NODE_TYPES.SpreadElement) return undefined;
    const value = unwrapAssertions(arg);
    return value.type === AST_NODE_TYPES.ObjectExpression ? value : undefined;
}

// the outermost assertion wrapping this expression, so `b as X` classifies like `b`
export function outermostAssertion(node: TSESTree.Expression): TSESTree.Expression {
    let current: TSESTree.Expression = node;
    while (
        current.parent.type === AST_NODE_TYPES.TSAsExpression ||
        current.parent.type === AST_NODE_TYPES.TSTypeAssertion ||
        current.parent.type === AST_NODE_TYPES.TSSatisfiesExpression ||
        current.parent.type === AST_NODE_TYPES.TSNonNullExpression
    ) {
        current = current.parent;
    }
    return current;
}

// unwrap as / satisfies / <T> so the expression behind them is still readable
export function unwrapAssertions(expr: TSESTree.Expression): TSESTree.Expression {
    let current = expr;
    while (
        current.type === AST_NODE_TYPES.TSAsExpression ||
        current.type === AST_NODE_TYPES.TSTypeAssertion ||
        current.type === AST_NODE_TYPES.TSSatisfiesExpression
    ) {
        current = current.expression;
    }
    return current;
}
