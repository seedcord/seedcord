import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

function isSeedcordSource(source: string): boolean {
    return source === 'seedcord' || source.startsWith('@seedcord/');
}

function decoratorName(decorator: TSESTree.Decorator): string | undefined {
    const expr = decorator.expression;
    if (expr.type === AST_NODE_TYPES.CallExpression && expr.callee.type === AST_NODE_TYPES.Identifier) {
        return expr.callee.name;
    }
    if (expr.type === AST_NODE_TYPES.Identifier) return expr.name;
    return undefined;
}

export function hasDecoratorNamed(node: TSESTree.ClassDeclaration, names: ReadonlySet<string>): boolean {
    return node.decorators.some((decorator) => {
        const name = decoratorName(decorator);
        return name !== undefined && names.has(name);
    });
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
