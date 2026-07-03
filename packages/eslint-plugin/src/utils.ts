import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import type { TSESTree } from '@typescript-eslint/utils';

export function isSeedcordSource(source: string): boolean {
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
